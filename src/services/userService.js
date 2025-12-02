// services/userService.js
const { minioClient, bucketName } = require('../utils/minioClient');
const createLogger = require('../utils/logger');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} = require('../utils/customErrors');
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
  // Validate user exists - throw expected error directly
  if (!user) {
    throw new NotFoundError('User not found');
  }

  try {
    // Check if email already exists (avoid reusing same email)
    if (updates.email && updates.email !== user.email) {
      const existing = await User.findOne({ where: { email: updates.email } });
      if (existing) {
        throw new ConflictError('Email already in use');
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
    // Re-throw expected errors (they should propagate)
    if (
      err instanceof NotFoundError ||
      err instanceof ConflictError ||
      err instanceof ValidationError
    ) {
      throw err;
    }

    // Only wrap truly unexpected errors
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

/**
 * Get all users with pagination
 * @param {Object} paginationOptions - Pagination options { page, pageSize }
 * @returns {Object} Paginated users result with metadata
 */
const getAllUsers = async (paginationOptions = {}) => {
  try {
    const { page = 1, pageSize = 10 } = paginationOptions;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Get total count and users in parallel
    const [totalCount, users] = await Promise.all([
      User.count(),
      User.findAll({
        attributes: { exclude: ['password'] }, // Exclude password from response
        limit: parseInt(pageSize, 10),
        offset: parseInt(offset, 10),
        order: [['createdAt', 'DESC']], // Order by newest first
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info(`Retrieved ${users.length} users (page ${page} of ${totalPages})`);

    return {
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    throw new InternalServerError('Failed to fetch users');
  }
};

/**
 * Add a skill to the authenticated user's skills list
 * @param {Object} user - User object
 * @param {string} skillId - Skill UUID
 * @returns {Object} Added skill object
 */
const addSkillToUser = async (user, skillId) => {
  try {
    const { Skill, UserSkills } = require('../models');

    // Check if skill exists
    const skill = await Skill.findByPk(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    // Check if user already has this skill
    const existingUserSkill = await UserSkills.findOne({
      where: {
        userId: user.id,
        skillId: skillId,
      },
    });

    if (existingUserSkill) {
      throw new ConflictError('User already has this skill');
    }

    // Add skill to user
    await UserSkills.create({
      userId: user.id,
      skillId: skillId,
    });

    logger.info(`Added skill ${skillId} to user ${user.id}`);

    return skill;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof ConflictError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    logger.error(`Error adding skill to user: ${error.message}`);
    throw new InternalServerError('Failed to add skill to user');
  }
};

/**
 * Remove a skill from the authenticated user's skills list
 * @param {Object} user - User object
 * @param {string} skillId - Skill UUID
 * @returns {boolean} True if removed successfully
 */
const removeSkillFromUser = async (user, skillId) => {
  try {
    const { UserSkills } = require('../models');

    // Check if user has this skill
    const userSkill = await UserSkills.findOne({
      where: {
        userId: user.id,
        skillId: skillId,
      },
    });

    if (!userSkill) {
      throw new NotFoundError('User does not have this skill');
    }

    // Remove skill from user
    await userSkill.destroy();

    logger.info(`Removed skill ${skillId} from user ${user.id}`);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    logger.error(`Error removing skill from user: ${error.message}`);
    throw new InternalServerError('Failed to remove skill from user');
  }
};

/**
 * Get all skills for the authenticated user
 * @param {Object} user - User object
 * @returns {Array} Array of user's skills
 */
const getUserSkills = async (user) => {
  try {
    const { User, Skill } = require('../models');

    // Reload user with skills association
    const userWithSkills = await User.findByPk(user.id, {
      include: [
        {
          model: Skill,
          as: 'skills',
          through: { attributes: [] }, // Exclude join table attributes
        },
      ],
    });

    return userWithSkills?.skills || [];
  } catch (error) {
    logger.error(`Error fetching user skills: ${error.message}`);
    throw new InternalServerError('Failed to fetch user skills');
  }
};

module.exports = {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
  getAllUsers,
  addSkillToUser,
  removeSkillFromUser,
  getUserSkills,
};
