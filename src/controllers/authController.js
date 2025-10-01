// controllers/authController.js
const Joi = require('joi');
const authService = require('../services/authService');
const logger = require('../utils/logger');

const signupSchema = Joi.object({
  fullname: Joi.string().min(2).required().messages({
    'string.empty': 'FullName is required',
    'string.min': 'FullName must be at least 2 characters long'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long'
  })
});
const signinSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long'
  })
});

class AuthController {
  async signup(req, res) {
    try {
      const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
       if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map((err) => err.message) // array of messages
        });
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
  async signin(req, res) {
    try {
      const { error, value } = signinSchema.validate(req.body, { abortEarly: false });
       if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map((err) => err.message) // array of messages
        });
      }

      const result = await authService.signin(value);

      logger.info(`Signin success for email=${value.email}`);

      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Signin failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
