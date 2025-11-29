const {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
  getAllUsers,
} = require('../services/userService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');
const {
  updateProfileSchema,
  changePasswordSchema,
  paginationQuerySchema,
} = require('../utils/validator');
const Validator = require('../utils/index');
const { clearAuthCookies } = require('../utils/cookies');

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

// PATCH new user
// PATCH /api/v1/user/profile
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { _value, errorResponse } = Validator.validate(updateProfileSchema, req.body);
    if (errorResponse) return res.status(400).json(errorResponse);

    const result = await updateProfileData(req.user, _value);

    logger.info(`Profile update successful for userId=${req.user.id}`);
    return res.status(200).json(result);
  } catch (err) {
    logger.error(`updateProfile failed for userId=${req.user?.id} - ${err.message}`);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

const getProfile = asyncHandler(async (req, res) => {
  try {
    const { password, ...user } = req.user.dataValues;
    logger.info(
      `Get Profile successful for userId=${req.user.dataValues.id}, ${password.slice(0, 1)}`
    );

    return res.status(200).json({
      success: true,
      message: 'Get Profile successfully',
      user: { ...user, skills: [] },
    });
  } catch (err) {
    logger.error(`get user profile failed for userId=${req.user?.id} - ${err.message}`);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

/**
 * Delete authenticated user's account
 * @route DELETE /api/v1/users/account
 * @access Private
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : 'unknown';

  const userId = req.user.id;

  await deleteUserAccount(userId, reason);

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: 'Your account have been permanently deleted',
  });
});

/**
 * Change authenticated user's password
 * @route PUT /api/v1/users/password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const body = req.body || {};

  // Validate body with Joi schema
  const { error, value } = changePasswordSchema.validate(body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { currentPassword, newPassword } = value;

  // Service enforces currentPassword correctness + new != current
  await changeUserPassword(req.user, currentPassword, newPassword);

  return res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * Get all users with pagination
 * @route GET /api/v1/users
 */
const getAllUsersController = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = paginationQuerySchema.validate(req.query);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { page, pageSize } = value;

  // Get paginated users
  const result = await getAllUsers({ page, pageSize });

  logger.info(`Retrieved users list - page ${page}, pageSize ${pageSize}`);

  return res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    ...result,
  });
});

module.exports = {
  updateProfilePicture,
  updateProfile,
  getProfile,
  deleteAccount,
  changePassword,
  getAllUsers: getAllUsersController,
};
