const authController = require('../../controllers/authController');
const authService = require('../../services/authService');
const logger = require('../../utils/logger');


jest.mock('../../services/authService');
jest.mock('../../utils/logger');

describe('AuthController - signin (Unit)', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { email: 'test@example.com', password: 'Password123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should return 200 and user data on successful signin', async () => {
    const mockResult = {
      message: 'User signed in successfully',
      success: true,
      access_token: 'fakeAccessToken',
      refresh_token: 'fakeRefreshToken',
      user: { id: 1, name: 'John Doe', email: 'test@example.com' },
    };

    authService.signin.mockResolvedValue(mockResult);

    await authController.signin(req, res);

    expect(authService.signin).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Signin success for email=${req.body.email}`)
    );
  });

  it('should return 400 on validation error', async () => {
    req.body = { email: 'invalid', password: 'short' }; // fails Joi schema

    await authController.signin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
      })
    );
  });

  it('should return 401 on invalid credentials', async () => {
    authService.signin.mockRejectedValue({ statusCode: 401, message: 'Invalid credentials.' });

    await authController.signin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid credentials.',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Signin failed for email=${req.body.email}`)
    );
  });

  it('should return 500 on unexpected error', async () => {
    authService.signin.mockRejectedValue(new Error('DB down'));

    await authController.signin(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'DB down',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Signin failed for email=${req.body.email}`)
    );
  });
});
