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
  const body = req.body || {};
  const { error, value } = updateProfileSchema.validate(body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(
      `validation error occurred when updating user profile reason=${errorMessages.join(', ')}`
    );
    throw new ValidationError('Validation failed', errorMessages);
  }

  const result = await updateProfileData(req.user, value);

  logger.info(`Profile update successful for userId=${req.user.id}`);
  return res.status(200).json(result);
});

const getProfile = asyncHandler(async (req, res) => {
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
  const { error, value } = changePasswordSchema.validate(body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(
      `validation error occurred when changing password reason=${errorMessages.join(', ')}`
    );
    throw new ValidationError('Validation failed', errorMessages);
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
  const { error, value } = paginationQuerySchema.validate(req.query, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(
      `validation error occurred when retrieving users reason=${errorMessages.join(', ')}`
    );
    throw new ValidationError('Validation failed', errorMessages);
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
  const { error, value } = addSkillToUserSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(
      `validation error occurred when adding skill to user reason=${errorMessages.join(', ')}`
    );
    throw new ValidationError('Validation failed', errorMessages);
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
