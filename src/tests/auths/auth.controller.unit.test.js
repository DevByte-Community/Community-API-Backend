// tests/auth.controller.unit.test.js
jest.mock('../../utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
  disconnect: jest.fn(),
}));

jest.mock('../../services/otpService', () => ({
  generateOtp: jest.fn(),
  saveOtpForEmail: jest.fn(),
  getOtpForEmail: jest.fn(),
  deleteOtpForEmail: jest.fn(),
}));

jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(),
}));

jest.mock('../../utils/index', () => ({
  validate: jest.fn(),
}));

const mockAuthService = {
  signup: jest.fn(),
  signin: jest.fn(),
  findUserByEmail: jest.fn(),
  updatePasswordByEmail: jest.fn().mockResolvedValue(),
  resetPassword: jest.fn(),
};

jest.mock('../../services/authService', () => mockAuthService);

// jest.mock('../../utils/logger');

const {
  generateOtp,
  saveOtpForEmail,
  getOtpForEmail,
  deleteOtpForEmail,
} = require('../../services/otpService');
const { sendOtpEmail } = require('../../services/emailService');
const Validator = require('../../utils/index');
const authService = require('../../services/authService');
const authController = require('../../controllers/authController');

// Helper for mock response
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AuthController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- SIGNUP ----------------
  describe('signup', () => {
    it('should return 201 on success', async () => {
      const req = {
        body: { fullname: 'John Doe', email: 'john@example.com', password: 'password123' },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { fullname: 'John Doe', email: 'john@example.com', password: 'password123' },
        errorResponse: null,
      });
      authService.signup.mockResolvedValue({ success: true, message: 'ok' });

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
    });

    it('should return 400 on validation error', async () => {
      const req = { body: { fullname: '', email: 'bademail', password: '123' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });
  });

  // ---------------- SIGNIN ----------------
  describe('signin', () => {
    it('should return 200 on success', async () => {
      const req = { body: { email: 'john@example.com', password: 'password123' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { email: 'john@example.com', password: 'password123' },
        errorResponse: null,
      });
      authService.signin.mockResolvedValue({ success: true, message: 'ok' });

      await authController.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
    });

    it('should return 400 on validation error', async () => {
      const req = { body: { email: 'notanemail', password: '123' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await authController.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });
  });

  // ---------------- FORGOT PASSWORD ----------------
  describe('forgotPassword', () => {
    it('should send OTP and return 200 even if email does not exist', async () => {
      const req = { body: { email: 'john@example.com' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { email: 'john@example.com' },
        errorResponse: null,
      });
      authService.findUserByEmail.mockResolvedValue(null); // user not found

      await authController.forgotPassword(req, res);

      expect(authService.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'An OTP has been sent to your email successfully',
      });
    });

    it('should generate and send OTP when user exists', async () => {
      const req = { body: { email: 'user@example.com' } };
      const res = mockResponse();

      const mockUser = { id: 1, email: 'user@example.com' };
      const mockOtp = '123456';

      Validator.validate.mockReturnValue({
        _value: { email: 'user@example.com' },
        errorResponse: null,
      });
      authService.findUserByEmail.mockResolvedValue(mockUser);
      generateOtp.mockReturnValue(mockOtp);
      saveOtpForEmail.mockResolvedValue();
      sendOtpEmail.mockResolvedValue();

      await authController.forgotPassword(req, res);

      expect(generateOtp).toHaveBeenCalled();
      expect(saveOtpForEmail).toHaveBeenCalledWith('user@example.com', mockOtp);
      expect(sendOtpEmail).toHaveBeenCalledWith('user@example.com', mockOtp);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'An OTP has been sent to your email successfully',
        })
      );
    });

    it('should handle internal errors gracefully', async () => {
      const req = { body: { email: 'john@example.com' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { email: 'john@example.com' },
        errorResponse: null,
      });
      authService.findUserByEmail.mockRejectedValue(new Error('DB error'));

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  // verify otp
  describe('verifyOtp', () => {
    it('should return 400 when validation fails', async () => {
      const req = { body: { email: 'invalid-email', otp: '123456' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await authController.verifyOtp(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation failed' });
      expect(getOtpForEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when OTP is invalid or expired', async () => {
      const req = { body: { email: 'john@example.com', otp: '000000' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          otp: '000000',
        },
        errorResponse: null,
      });
      getOtpForEmail.mockResolvedValue(null); // Expired or not found

      await authController.verifyOtp(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(getOtpForEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired OTP',
      });
      expect(deleteOtpForEmail).not.toHaveBeenCalled();
    });

    it('should verify OTP successfully when valid', async () => {
      const req = { body: { email: 'john@example.com', otp: '123456' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          otp: '123456',
        },
        errorResponse: null,
      });
      getOtpForEmail.mockResolvedValue('123456');
      deleteOtpForEmail.mockResolvedValue();

      await authController.verifyOtp(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(getOtpForEmail).toHaveBeenCalledWith('john@example.com');
      expect(deleteOtpForEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verified otp successfully',
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      const req = { body: { email: 'john@example.com', otp: '123456' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          otp: '123456',
        },
        errorResponse: null,
      });
      getOtpForEmail.mockRejectedValue(new Error('Something went wrong'));

      await authController.verifyOtp(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(getOtpForEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
      expect(deleteOtpForEmail).not.toHaveBeenCalled();
    });
  });

  // ---------------- RESET PASSWORD ----------------
  describe('resetPassword', () => {
    it('should return 200 when password is reset successfully', async () => {
      const req = {
        body: {
          email: 'john@example.com',
          current_password: 'oldPassword123',
          new_password: 'newPassword123',
        },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          current_password: 'oldPassword123',
          new_password: 'newPassword123',
        },
        errorResponse: null,
      });
      mockAuthService.resetPassword.mockResolvedValue(true);

      await authController.resetPassword(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        email: 'john@example.com',
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should return 400 when validation fails', async () => {
      const req = {
        body: {
          email: 'invalid-email',
          current_password: '',
          new_password: 'short',
        },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: {
          success: false,
          message: 'Validation failed',
          errors: ['Email must be a valid email address', 'Current password is required'],
        },
      });

      await authController.resetPassword(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
        })
      );
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      const req = {
        body: {
          email: 'nonexistent@example.com',
          current_password: 'password123',
          new_password: 'newPassword123',
        },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'nonexistent@example.com',
          current_password: 'password123',
          new_password: 'newPassword123',
        },
        errorResponse: null,
      });

      const error = new Error('User not found');
      error.statusCode = 404;
      mockAuthService.resetPassword.mockRejectedValue(error);

      await authController.resetPassword(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        email: 'nonexistent@example.com',
        currentPassword: 'password123',
        newPassword: 'newPassword123',
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 401 when current password is incorrect', async () => {
      const req = {
        body: {
          email: 'john@example.com',
          current_password: 'wrongPassword',
          new_password: 'newPassword123',
        },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          current_password: 'wrongPassword',
          new_password: 'newPassword123',
        },
        errorResponse: null,
      });

      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      mockAuthService.resetPassword.mockRejectedValue(error);

      await authController.resetPassword(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        email: 'john@example.com',
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect',
      });
    });

    it('should return 500 when an unexpected error occurs', async () => {
      const req = {
        body: {
          email: 'john@example.com',
          current_password: 'password123',
          new_password: 'newPassword123',
        },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: {
          email: 'john@example.com',
          current_password: 'password123',
          new_password: 'newPassword123',
        },
        errorResponse: null,
      });

      const error = new Error('Database connection error');
      mockAuthService.resetPassword.mockRejectedValue(error);

      await authController.resetPassword(req, res);

      expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        email: 'john@example.com',
        currentPassword: 'password123',
        newPassword: 'newPassword123',
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection error',
      });
    });
  });
});
