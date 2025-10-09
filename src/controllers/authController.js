// controllers/authController.js
const authService = require('../services/authService');
const createLogger = require('../utils/logger');
const Validator = require('../utils/index');
const { signupSchema, signinSchema, forgotPasswordSchema, verifyOtpSchema } = require('../utils/validator');
const { generateOtp, saveOtpForEmail } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');


const logger = createLogger('MODULE:AUTH_CONTROLLER');

class AuthController {

  // POST /api/v1/auth/signup
  async signup(req, res) {
    try {
      const { value, errorResponse } = Validator.validate(signupSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signup(value);

      logger.info(`Signup success for email=${value.email}`);
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
      const { value, errorResponse } = Validator.validate(signinSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const result = await authService.signin(value);

      logger.info(`Signin success for email=${value.email}`);

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
      const { value, errorResponse } = Validator.validate(forgotPasswordSchema, req.body);
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


  // POST /api/v1/auth/reset-password
  // POST /api/v1/auth/verify-otp
  async verifyOtp(req, res) {
    try {
      const { value, errorResponse } = Validator.validate(verifyOtpSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const email = value.email.toLowerCase();
      const otpProvided = value.otp;
      const newPassword = value.new_password;

      const { getOtpForEmail, deleteOtpForEmail } = require('../services/otpService');
      const storedOtp = await getOtpForEmail(email);

      if (!storedOtp || storedOtp !== otpProvided) {
        logger.info(`invalid or expired otp attempt for ${email}`);
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      // OTP valid - update password in DB
      await authService.updatePasswordByEmail(email, newPassword);

      // remove OTP
      await deleteOtpForEmail(email);

      logger.info(`Password reset for ${email}`);
      return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      // do not log password or OTP
      logger.error(`verifyOtp error - ${err.message}`);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

}

module.exports = new AuthController();
