// controllers/authController.js
const authService = require('../services/authService');
const logger = require('../utils/logger');
const Validator = require('../utils/index');
const { signupSchema, signinSchema } = require('../utils/validator');

const MODULE = 'AUTH_CONTROLLER';

// Helper to prefix logs with timestamp and module name
const logWithMeta = (level, message) => {
  const timestamp = new Date().toISOString();
  logger[level](`${timestamp}:[${MODULE}]: ${message}`);
};


class AuthController {
  async signup(req, res) {
    try {
      const { value, errorResponse } = Validator.validate(signupSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signup(value);

      logger.info(`Signup success for email=${value.email}`);
      logWithMeta('info', `Signup success for email=${value.email}`);

      return res.status(201).json(result);
    } catch (err) {
      logger.error(`Signup failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
  async signin(req, res) {
    try {
      const { value, errorResponse } = Validator.validate(signinSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signin(value);

      logger.info(`Signin success for email=${value.email}`);
      logWithMeta('info', `Signin success for email=${value.email}`);

      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Signin failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
