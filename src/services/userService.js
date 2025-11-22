// services/userService.js
const { minioClient, bucketName } = require('../utils/minioClient');
const createLogger = require('../utils/logger');
const { ValidationError, NotFoundError, InternalServerError } = require('../utils/customErrors');
const path = require('path');
const { User } = require('../models');
const bcrypt = require('bcrypt');

const logger = createLogger('USER_SERVICE');
const SALT_ROUNDS = 10;

/**
 * Upload profile picture for a user
 * @param {Object} user - User object from database
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFileName - Original file name
 * @param {string} mimeType - File MIME type (already validated by middleware)
 * @returns {Object} Updated user object
 */
const uploadProfilePicture = async (
  user,
  fileBuffer,
  originalFileName,
  mimeType = 'image/jpeg'
) => {
  try {
    logger.info(`Uploading profile picture for user ${user.id} using: ${originalFileName}`);

    // Extract file extension (file already validated by multer middleware)
    const fileExtension = path.extname(originalFileName).toLowerCase().replace('.', '');

    // If user has an existing profile picture, delete it (fire and forget)
    if (user.profilePicture) {
      const oldKey = user.profilePicture.split('/').pop();
      // Fire and forget - don't wait for deletion to complete
      deleteFile(oldKey);
    }

    // Generate unique file name
    const fileName = `profile_picture_${user.id}_${Date.now()}.${fileExtension}`;

    // Upload to MinIO
    await minioClient.putObject(bucketName, fileName, fileBuffer, fileBuffer.length, {
      'Content-Type': mimeType,
    });

    // Generate file URL
    const fileUrl = `${bucketName}/${fileName}`;

    // Update user in database
    await user.update({
      profilePicture: fileUrl,
      updatedAt: new Date(),
    });

    logger.info(`Profile picture uploaded successfully for user ${user.id}`);

    return {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    logger.error(`Error uploading profile picture: ${error.message}`);

    // Re-throw custom errors
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    // Wrap other errors in InternalServerError
    throw new InternalServerError(`Failed to upload profile picture: ${error.message}`);
  }
};

// update user profile (fullname only for now)
const updateProfileData = async (user, updates) => {
  try {
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if email already exists (avoid reusing same email)
    if (updates.email && updates.email !== user.email) {
      const existing = await User.findOne({ where: { email: updates.email } });
      if (existing) {
        const error = new Error('Email already in use');
        error.statusCode = 409;
        throw error;
      }
    }

    // Only update provided fields
    if (updates.fullname) user.fullname = updates.fullname;
    if (updates.email) user.email = updates.email;
    user.updatedAt = new Date();

    await user.save();

    logger.info(`User profile updated for id=${user.id}`);

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        updatedAt: user.updatedAt,
      },
    };
  } catch (err) {
    logger.error(`updateProfile failed for id=${user?.id} - ${err.message}`);
    throw new InternalServerError(`Failed to update profile: ${err.message}`);
  }
};

/**
 * Permanently delete a user account (soft-delete row + delete MinIO files)
 * @param {string} userId - ID of the authenticated user
 * @param {string|undefined} reason - Optional reason for deletion
 */
const deleteUserAccount = async (userId, reason) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      logger.warn(`ACCOUNT_DELETE: user not found userId=${userId}`);
      throw new NotFoundError('User not found');
    }

    // Collect all user-owned MinIO objects (profile picture + cover image, etc.)
    let objectKey = '';
    if (user.profilePicture) {
      objectKey = extractObjectKeyFromUrl(user.profilePicture);

      // Delete files from MinIO
      deleteFile(objectKey);
    }

    await user.destroy();

    // Irreversible audit log
    logger.info(`userId=${user.id} email=${user.email} reason="${reason || ''}"`);

    return true;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error deleting user account: ${error.message}`);
    throw new InternalServerError('Failed to delete account');
  }
};

/**
 * Change user password with current password verification + policy enforcement
 * @param {string} user
 * @param {string} currentPassword
 * @param {string} newPassword
 */
const changeUserPassword = async (user, currentPassword, newPassword) => {
  try {
    // Verify current password
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      logger.warn(`invalid current password userId=${user.id}`);
      throw new ValidationError('Current password is incorrect');
    }

    // Policy: new password must be different from current
    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await user.update({
      password: hashed,
      updatedAt: new Date(),
    });

    logger.info(`update password successful for userId=${user.id} email=${user.email}`);

    return true;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error changing user password: ${error.message}`);
    throw new InternalServerError('Failed to change password');
  }
};

const extractObjectKeyFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
};

// delete object from s3 bucket
const deleteFile = (key) => {
  minioClient
    .removeObject(bucketName, key)
    .then(() => {
      logger.info(`Old profile picture deleted: ${key}`);
    })
    .catch((error) => {
      logger.warn(`Failed to delete old profile picture: ${error.message}`);
    });
};

module.exports = {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
};
