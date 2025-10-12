const { uploadProfilePicture } = require('../services/userService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');

const logger = createLogger('USER_CONTROLLER');

/**
 * Update user profile picture
 * @route PATCH /api/v1/user/profile/picture
 * @access Private
 */
const updateProfilePicture = asyncHandler(async (req, res) => {
  // Validate file upload
  if (!req.file) {
    throw new ValidationError('No file uploaded. Please provide a profile picture.');
  }

  const userId = req.user.id;
  const fileBuffer = req.file.buffer;
  const originalFileName = req.file.originalname;
  const mimeType = req.file.mimetype; // Already validated by multer middleware

  // Upload the profile picture (service will throw errors if something fails)
  const updatedUser = await uploadProfilePicture(req.user, fileBuffer, originalFileName, mimeType);

  logger.info(`Profile picture updated successfully - User ID: ${userId}`);

  return res.status(200).json({
    success: true,
    message: 'Profile picture updated successfully',
    user: updatedUser,
  });
});

module.exports = {
  updateProfilePicture,
};
