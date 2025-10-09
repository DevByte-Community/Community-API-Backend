// tests/auth.controller.unit.test.js
jest.mock('../../services/otpService', () => ({
  generateOtp: jest.fn(),
  saveOtpForEmail: jest.fn(),
  getOtpForEmail: jest.fn(),
  deleteOtpForEmail: jest.fn(),
}));

jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(),
}));

jest.mock('../../services/authService');
// jest.mock('../../utils/logger');


const { generateOtp, saveOtpForEmail } = require('../../services/otpService');
const { sendOtpEmail } = require('../../services/emailService');
const authController = require('../../controllers/authController');
const authService = require('../../services/authService');
// const logger = require('../../utils/logger');

// jest.mock('../../services/authService');
// // jest.mock('../../utils/logger');

// // Mock other services dynamically required in controller
// jest.mock('../../services/otpService', () => ({
//   generateOtp: jest.fn(),
//   saveOtpForEmail: jest.fn(),
//   getOtpForEmail: jest.fn(),
//   deleteOtpForEmail: jest.fn(),
// }));
// jest.mock('../../services/emailService', () => ({
//   sendOtpEmail: jest.fn(),
// }));

const { getOtpForEmail, deleteOtpForEmail } = require('../../services/otpService');


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
      const req = { body: { fullname: 'John Doe', email: 'john@example.com', password: 'password123' } };
      const res = mockResponse();

      authService.signup.mockResolvedValue({ success: true, message: 'ok' });

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
    });

    it('should return 400 on validation error', async () => {
      const req = { body: { fullname: '', email: 'bademail', password: '123' } };
      const res = mockResponse();

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Validation failed' }));
    });
  });

  // ---------------- SIGNIN ----------------
  describe('signin', () => {
    it('should return 200 on success', async () => {
      const req = { body: { email: 'john@example.com', password: 'password123' } };
      const res = mockResponse();

      authService.signin.mockResolvedValue({ success: true, message: 'ok' });

      await authController.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
    });

    it('should return 400 on validation error', async () => {
      const req = { body: { email: 'notanemail', password: '123' } };
      const res = mockResponse();

      await authController.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Validation failed' }));
    });
  });

  // ---------------- FORGOT PASSWORD ----------------
  describe('forgotPassword', () => {
    it('should send OTP and return 200 even if email does not exist', async () => {
      const req = { body: { email: 'john@example.com' } };
      const res = mockResponse();

      authService.findUserByEmail.mockResolvedValue(null); // user not found

      await authController.forgotPassword(req, res);

      expect(authService.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'An OTP has been sent your email successfully',
      });
    });

    it('should generate and send OTP when user exists', async () => {
      const req = { body: { email: 'user@example.com' } };
      const res = mockResponse();

      const mockUser = { id: 1, email: 'user@example.com' };
      const mockOtp = '123456';

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
          message: 'An OTP has been sent your email successfully',
        })
      );
    });


    it('should handle internal errors gracefully', async () => {
      const req = { body: { email: 'john@example.com' } };
      const res = mockResponse();

      authService.findUserByEmail.mockRejectedValue(new Error('DB error'));

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  // ---------------- VERIFY OTP ----------------
  describe('verifyOtp', () => {
    it('should return 400 when OTP is invalid', async () => {
      const req = { body: { email: 'john@example.com', otp: '000000', new_password: 'newpass123' } };
      const res = mockResponse();

      getOtpForEmail.mockResolvedValue(null); // expired or not found

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired OTP',
      });
    });

    it('should reset password successfully when OTP is valid', async () => {
      const req = { body: { email: 'john@example.com', otp: '123456', new_password: 'newpass123' } };
      const res = mockResponse();

      getOtpForEmail.mockResolvedValue('123456');
      authService.updatePasswordByEmail.mockResolvedValue();
      deleteOtpForEmail.mockResolvedValue();

      await authController.verifyOtp(req, res);

      expect(authService.updatePasswordByEmail).toHaveBeenCalledWith('john@example.com', 'newpass123');
      expect(deleteOtpForEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      const req = { body: { email: 'john@example.com', otp: '123456', new_password: 'newpass123' } };
      const res = mockResponse();

      getOtpForEmail.mockRejectedValue(new Error('Something went wrong'));

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });
  
});
