// controllers/authController.js
const authService = require('../services/authService');
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
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/customErrors');
const createLogger = require('../utils/logger');
const cookiesConfig = require('../utils/authCookieConfig');

const logger = createLogger('AUTH_CONTROLLER');

class AuthController {
  // POST /api/v1/auth/signup
  signup = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { error, value } = signupSchema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.error(`validation error occurred when signing up reason=${errorMessages.join(', ')}`);
      throw new ValidationError('Validation failed', errorMessages);
    }

    const result = await authService.signup(value);
    setAuthCookies(res, result.tokens);

    logger.info(`Signup success for email=${value.email}`);
    return res.status(201).json({
      message: result.message,
      success: result.success,
    });
  });

  // POST /api/v1/auth/signin
  signin = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { error, value } = signinSchema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.error(`validation error occurred when signing in reason=${errorMessages.join(', ')}`);
      throw new ValidationError('Validation failed', errorMessages);
    }

    const result = await authService.signin(value);
    setAuthCookies(res, result.tokens);

    logger.info(`Signin success for email=${value.email}`);

    return res.status(200).json({
      message: result.message,
      success: result.success,
      access_token: result.tokens.accessToken, // <-- add this 
      refresh_token: result.tokens.refreshToken, // optional
    });
  });

  /** POST /api/v1/auth/refresh */
  refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[cookiesConfig.REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }

    const result = await authService.refresh(refreshToken);
    setAuthCookies(res, result.tokens);

    logger.info(`Refresh token operation successful`);
    return res.json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/v1/auth/forgot-password
  forgotPassword = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { error, value } = forgotPasswordSchema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.error(
        `validation error occurred when requesting forgot password reason=${errorMessages.join(', ')}`
      );
      throw new ValidationError('Validation failed', errorMessages);
    }

    const email = value.email.toLowerCase();

    // Check if user exists
    const user = await authService.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError('User with this email does not exist');
    }

    // Generate & save OTP, then send email
    const otp = generateOtp();
    await saveOtpForEmail(email, otp);
    await sendOtpEmail(email, otp);

    logger.info(`Forgot password requested for ${email}`);
    return res.status(200).json({
      success: true,
      message: 'An OTP has been sent to your email successfully',
    });
  });

  // POST /api/v1/auth/verify-otp
  verifyOtp = asyncHandler(async (req, res) => {
    logger.info('otp code verification starts...');
    const body = req.body || {};
    const { error, value } = verifyOtpSchema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.error(
        `validation error occurred when verifying OTP reason=${errorMessages.join(', ')}`
      );
      throw new ValidationError('Validation failed', errorMessages);
    }

    const email = value.email.toLowerCase();
    const otpProvided = value.otp;

    const storedOtp = await getOtpForEmail(email);

    if (!storedOtp || storedOtp !== otpProvided) {
      logger.info(`invalid or expired otp attempt for ${email}`);
      throw new ValidationError('Invalid or expired OTP');
    }

    // remove OTP
    await deleteOtpForEmail(email);

    logger.info(`Otp code verified successfully for ${email}`);
    return res.status(200).json({ success: true, message: 'Verified otp successfully' });
  });

  // POST /api/v1/auth/reset-password
  resetPassword = asyncHandler(async (req, res) => {
    logger.info('reset password operation starts...');
    const body = req.body || {};
    const { error, value } = resetPasswordSchema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.error(
        `validation error occurred when resetting password reason=${errorMessages.join(', ')}`
      );
      throw new ValidationError('Validation failed', errorMessages);
    }

    const email = value.email.toLowerCase();
    const newPassword = value.new_password;

    await authService.resetPassword({
      email,
      newPassword,
    });

    logger.info(`Password reset successfully for ${email}`);
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  });

  // POST /api/v1/auth/signout
  signOut = asyncHandler(async (req, res) => {
    clearAuthCookies(res); // uses the same cookie options and names from the utils/cookies.js

    logger.info('User signed out successfully.');

    return res.status(200).json({
      success: true,
      message: 'Signed out successfully',
    });
  });
}

module.exports = new AuthController();
