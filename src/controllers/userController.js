const {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
  getAllUsers,
  addSkillToUser,
  removeSkillFromUser,
  getUserSkills,
} = require('../services/userService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');
const {
  updateProfileSchema,
  changePasswordSchema,
  paginationQuerySchema,
  addSkillToUserSchema,
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
    // Get user with skills
    const skills = await getUserSkills(req.user);
    const { password, ...user } = req.user.dataValues;

    logger.info(
      `Get Profile successful for userId=${req.user.dataValues.id}, ${password.slice(0, 1)}`
    );

    return res.status(200).json({
      success: true,
      message: 'Get Profile successfully',
      user: { ...user, skills },
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

/**
 * Add a skill to authenticated user's skills list
 * @route POST /api/v1/users/me/skills
 * @access Private
 */
const addSkillToUserController = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = addSkillToUserSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { skillId } = value;

  const skill = await addSkillToUser(req.user, skillId);

  logger.info(`Skill ${skillId} added to user ${req.user.id}`);

  return res.status(200).json({
    success: true,
    message: 'Skill added to your profile successfully',
    skill,
  });
});

/**
 * Remove a skill from authenticated user's skills list
 * @route DELETE /api/v1/users/me/skills/:skillId
 * @access Private
 */
const removeSkillFromUserController = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  await removeSkillFromUser(req.user, skillId);

  logger.info(`Skill ${skillId} removed from user ${req.user.id}`);

  return res.status(200).json({
    success: true,
    message: 'Skill removed from your profile successfully',
  });
});

/**
 * Get all skills for authenticated user
 * @route GET /api/v1/users/me/skills
 * @access Private
 */
const getUserSkillsController = asyncHandler(async (req, res) => {
  const skills = await getUserSkills(req.user);

  logger.info(`Retrieved ${skills.length} skills for user ${req.user.id}`);

  return res.status(200).json({
    success: true,
    message: 'User skills retrieved successfully',
    skills,
    count: skills.length,
  });
});

module.exports = {
  updateProfilePicture,
  updateProfile,
  getProfile,
  deleteAccount,
  changePassword,
  getAllUsers: getAllUsersController,
  addSkillToUser: addSkillToUserController,
  removeSkillFromUser: removeSkillFromUserController,
  getUserSkills: getUserSkillsController,
};
