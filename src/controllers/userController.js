const { uploadProfilePicture, updateProfileData } = require('../services/userService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');
const { updateProfileSchema } = require('../utils/validator');
const Validator = require('../utils/index');

const logger = createLogger('MODULE:USER_CONTROLLER');

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

// POST new user
// PATCH /api/v1/user/profile
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { _value, errorResponse } = Validator.validate(updateProfileSchema, req.body);
    if (errorResponse) return res.status(400).json(errorResponse);

    const userId = req.user.id; // comes from authentication middleware
    // const result = await userService.updateProfile(userId, _value);

    const result = await updateProfileData(userId, _value);

    // GET user by ID
    logger.info(`Profile update successful for userId=${userId}`);
    return res.status(200).json(result);
  } catch (err) {
    logger.error(`updateProfile failed for userId=${req.user?.id} - ${err.message}`);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}
);


//  const fetchUser = (req, res) => {
//   res.json({ message: 'User creation (to be implemented)' });
// };

//  const createUser = (req, res) => {
//   res.json({ message: 'User creation (to be implemented)' });
// };

module.exports = {
  updateProfilePicture,
  updateProfile,
  LogoutUser,
  // createUser,
  // fetchUser,
};
