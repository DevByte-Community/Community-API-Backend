// controllers/authController.js
const authService = require('../services/authService');
const createLogger = require('../utils/logger');
const Validator = require('../utils/index');
const {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require('../utils/validator');
const {
  generateOtp,
  saveOtpForEmail,
  getOtpForEmail,
  deleteOtpForEmail,
} = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');

const logger = createLogger('AUTH_CONTROLLER');

class AuthController {
  // POST /api/v1/auth/signup
  async signup(req, res) {
    try {
      const { _value, errorResponse } = Validator.validate(signupSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signup(_value);

      logger.info(`Signup success for email=${_value.email}`);
      return res.status(201).json(result);
    } catch (err) {
      logger.error(`Signup failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  // POST /api/v1/auth/signin
  async signin(req, res) {
    try {
      const { _value, errorResponse } = Validator.validate(signinSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signin(_value);

      logger.info(`Signin success for email=${_value.email}`);

      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Signin failed for email=${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req, res) {
    const email = (req.body.email || '').toLowerCase();
    try {
      const { _value, errorResponse } = Validator.validate(forgotPasswordSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      // NB: we do not reveal whether an email exists
      const user = await authService.findUserByEmail(email);
      if (user) {
        // generate & save OTP, then send email
        const otp = generateOtp();
        await saveOtpForEmail(email, otp);
        await sendOtpEmail(email, otp).catch((err) => {
          // sending failure should not reveal to client — log it
          logger.error(`Failed to send OTP to ${email} - ${err.message}`);
        });
      }

      logger.info(`Forgot password requested for ${email}`);
      return res.status(200).json({
        success: true,
        message: 'An OTP has been sent your email successfully',
      });
    } catch (err) {
      logger.error(`forgotPassword error for ${email} - ${err.message}`);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // POST /api/v1/auth/verify-otp
  async verifyOtp(req, res) {
    logger.info('otp code verification starts...');
    try {
      const { _value, errorResponse } = Validator.validate(verifyOtpSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const email = _value.email.toLowerCase();
      const otpProvided = _value.otp;

      const storedOtp = await getOtpForEmail(email);

      if (!storedOtp || storedOtp !== otpProvided) {
        logger.info(`invalid or expired otp attempt for ${email}`);
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      // remove OTP
      await deleteOtpForEmail(email);

      logger.info(`Password reset for ${email}`);
      return res.status(200).json({ success: true, message: 'Verified otp successfully' });
    } catch (err) {
      // do not log password or OTP
      logger.error(`verifyOtp error - ${err.message}`);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // POST /api/v1/auth/reset-password
  async resetPassword(req, res) {
    logger.info('reset password operation starts...');
    try {
      const { _value, errorResponse } = Validator.validate(resetPasswordSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const email = _value.email.toLowerCase();
      const currentPassword = _value.current_password;
      const newPassword = _value.new_password;

      await authService.resetPassword({
        email,
        currentPassword,
        newPassword,
      });

      logger.info(`Password reset successfully for ${email}`);
      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (err) {
      logger.error(`resetPassword error for ${req.body.email} - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
