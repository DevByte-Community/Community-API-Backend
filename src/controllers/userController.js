// controllers/userController.js
const userService = require('../services/userService');
const createLogger = require('../utils/logger');
const Validator = require('../utils/index');
const { updateProfileSchema } = require('../utils/validator');

const logger = createLogger('MODULE:USER_CONTROLLER');

class UserController {

  // PATCH /api/v1/user/profile
  async updateProfile(req, res) {
    try {
      const { _value, errorResponse } = Validator.validate(updateProfileSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const userId = req.user.id; // comes from authentication middleware
      const result = await userService.updateProfile(userId, _value);

      logger.info(`Profile update successful for userId=${userId}`);
      return res.status(200).json(result);
    } catch (err) {
      logger.error(`updateProfile failed for userId=${req.user?.id} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

}

module.exports = new UserController();
