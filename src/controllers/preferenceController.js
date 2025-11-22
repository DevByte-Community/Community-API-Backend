const { getUserPreferences, updateUserPreferences } = require('../services/preferenceService');
const { asyncHandler } = require('../middleware/errorHandler');
const { preferencesUpdateSchema } = require('../utils/validator');
const { ValidationError } = require('../utils/customErrors');
const createLogger = require('../utils/logger');

const logger = createLogger('PREFERENCES_CONTROLLER');

/**
 * GET /api/v1/users/preferences
 */
const getMyPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const prefs = await getUserPreferences(userId);
  logger.info(`successfully retrieved preferences id=${prefs.id}`);

  return res.status(200).json(prefs);
});

/**
 * PATCH /api/v1/users/preferences
 */
const updateMyPreferences = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { error, value } = preferencesUpdateSchema.validate(body);

  if (error) {
    logger.error(
      `validation error occurred when updating user preferences reason=${error.message}`
    );
    throw new ValidationError(error.details[0].message);
  }

  const userId = req.user.id;

  const updatedPrefs = await updateUserPreferences(userId, value);
  logger.info(`successfully updated preferences id=${updatedPrefs.id}`);
  return res.status(200).json({
    success: true,
    message: 'Preferences updated',
    preferences: updatedPrefs,
  });
});

module.exports = {
  getMyPreferences,
  updateMyPreferences,
};
