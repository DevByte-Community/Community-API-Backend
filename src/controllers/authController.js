// controllers/authController.js
const Joi = require('joi');
const authService = require('../services/authService');
const logger = require('../utils/logger');

const signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

class AuthController {
  async signup(req, res) {
    try {
      const { error, value } = signupSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const result = await authService.signup(value);

      logger.info(`Signup success for email=${value.email}`);

      return res.status(201).json(result);
    } catch (err) {
      logger.error(`Signup failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
