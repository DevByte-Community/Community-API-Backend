// tests/auth.controller.unit.test.js
const authController = require('../../controllers/authController');
const authService = require('../../services/authService');

jest.mock('../../services/authService');

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
});
