const { minioClient, bucketName } = require('../utils/minioClient');
const createLogger = require('../utils/logger');
const { ValidationError, NotFoundError, InternalServerError } = require('../utils/customErrors');
const path = require('path');

const logger = createLogger('USER_SERVICE');

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
      minioClient
        .removeObject(bucketName, oldKey)
        .then(() => {
          logger.info(`Old profile picture deleted: ${oldKey}`);
        })
        .catch((error) => {
          logger.warn(`Failed to delete old profile picture: ${error.message}`);
        });
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

module.exports = {
  uploadProfilePicture,
};
