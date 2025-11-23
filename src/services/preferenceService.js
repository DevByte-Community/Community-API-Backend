const { Preference } = require('../models');
const createLogger = require('../utils/logger');
const { ValidationError, NotFoundError, InternalServerError } = require('../utils/customErrors');

const logger = createLogger('PREFERENCES_SERVICE');

/**
 * Create default preferences for a given user
 * (using model defaults: visibility=true, notification=true, newsletter=false, etc.)
 */
const createDefaultUserPreferences = async (userId) => {
  try {
    const pref = await Preference.create({ userId });
    logger.info(`created default preferences for userId=${userId}`);

    return mapPreferenceResponse(pref);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error(`Error creating default preferences for userId=${userId}: ${error.message}`);
    throw new InternalServerError('Failed to create user preferences');
  }
};

/**
 * Get preferences for the given user
 */
const getUserPreferences = async (userId) => {
  try {
    const pref = await Preference.findOne({ where: { userId } });
    if (!pref) {
      throw new NotFoundError('User preferences does not exist');
    }

    return mapPreferenceResponse(pref);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error fetching user preferences: ${error.message}`);
    throw new InternalServerError('Failed to fetch preferences');
  }
};

/**
 * Update preferences for the given user
 * @param {string} userId
 * @param {object} patch - partial update fields
 */
const updateUserPreferences = async (userId, patch) => {
  try {
    let pref = await Preference.findOne({ where: { userId } });

    if (!pref) {
      // No preferences row yet → create with incoming patch + defaults
      logger.warn(`Preferences not found for userId=${userId}, creating with patch values`);

      pref = await Preference.create({
        userId,
        ...patch, // only provided fields override defaults
      });

      const createdFields = Object.keys(patch).join(',') || 'defaults-only';
      logger.info(`successfully created preference for userId=${userId} fields=${createdFields}`);
    } else {
      // Row exists → normal update
      await pref.update({
        ...patch,
        updatedAt: new Date(),
      });

      const updatedFields = Object.keys(patch).join(',');
      logger.info(`successfully updated preference of userId=${userId} fields=${updatedFields}`);
    }

    return mapPreferenceResponse(pref);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error updating user preferences: ${error.message}`);
    throw new InternalServerError('Failed to update preferences');
  }
};

const mapPreferenceResponse = (pref) => ({
  visibility: pref.visibility,
  notification: pref.notification,
  newsletter: pref.newsletter,
  appearance: pref.appearance,
  language: pref.language,
  timezone: pref.timezone,
  createdAt: pref.createdAt,
  updatedAt: pref.updatedAt,
});

module.exports = {
  getUserPreferences,
  updateUserPreferences,
  createDefaultUserPreferences,
};
