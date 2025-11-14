// tests/auth.service.unit.test.js
const bcrypt = require('bcrypt');
const { User } = require('../../models');
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt');
const authService = require('../../services/authService');

jest.mock('bcrypt');
jest.mock('../../models', () => ({
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));
jest.mock('../../utils/jwt', () => ({
  generateTokens: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

describe('AuthService', () => {
  const mockUser = {
    id: 'user-uuid-123',
    fullname: 'John Doe',
    email: 'john@example.com',
    role: 'USER',
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // SIGNUP ─────────────────────────────
  describe('signup', () => {
    it('should hash password, create user, and return tokens', async () => {
      bcrypt.hash.mockResolvedValue('hashed_pw');
      User.create.mockResolvedValue({
        id: 1,
        fullname: 'John Doe',
        email: 'john@example.com',
        roles: ['USER'],
        createdAt: new Date(),
      });
      generateTokens.mockReturnValue({ accessToken: 'acc', refreshToken: 'ref' });
      const result = await authService.signup({
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(User.create).toHaveBeenCalled();
      expect(generateTokens).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'User registered successfully',
        success: true,
        tokens: { accessToken: 'acc', refreshToken: 'ref' },
      });
    });

    it('should throw error if email already registered', async () => {
      const { UniqueConstraintError } = require('sequelize');
      bcrypt.hash.mockResolvedValue('hashed_pw');
      User.create.mockRejectedValue(new UniqueConstraintError());

      await expect(
        authService.signup({
          fullname: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already registered.');
    });
  });

  // SIGNIN ─────────────────────────────
  describe('signin', () => {
    it('should return tokens if credentials valid', async () => {
      const user = {
        id: 1,
        fullname: 'John Doe',
        email: 'john@example.com',
        roles: ['USER'],
        password: 'hashed_pw',
        createdAt: new Date(),
      };

      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      generateTokens.mockReturnValue({ accessToken: 'acc', refreshToken: 'ref' });

      const result = await authService.signin({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_pw');
      expect(result).toHaveProperty('success', true);
    });

    it('should throw error if user not found', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.signin({ email: 'notfound@example.com', password: 'password123' })
      ).rejects.toThrow('Invalid credentials.');
    });

    it('should throw error if password mismatch', async () => {
      User.findOne.mockResolvedValue({ email: 'john@example.com', password: 'hashed_pw' });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.signin({ email: 'john@example.com', password: 'wrongpass' })
      ).rejects.toThrow('Invalid credentials.');
    });
  });

  // FIND USER BY EMAIL ─────────────────────────────
  describe('findUserByEmail', () => {
    it('should call User.findOne with correct email', async () => {
      const mockUser = { id: 1, email: 'user@example.com' };
      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.findUserByEmail('user@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
      expect(result).toEqual(mockUser);
    });
  });

  // REFRESH TOKEN
  describe('refresh', () => {
    const validRefreshToken = 'valid.jwt.token';
    const payload = { id: mockUser.id };

    beforeEach(() => {
      verifyRefreshToken.mockReturnValue(payload);
      User.findByPk.mockResolvedValue(mockUser);
      generateTokens.mockReturnValue(mockTokens);
    });

    it('should refresh tokens successfully with valid token', async () => {
      const result = await authService.refresh(validRefreshToken);

      expect(verifyRefreshToken).toHaveBeenCalledWith(validRefreshToken);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id, {
        attributes: ['id', 'fullname', 'email', 'role'],
      });
      expect(generateTokens).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        success: true,
        message: 'Tokens refreshed successfully',
        tokens: mockTokens,
      });
    });

    it('should throw 401 if refresh token is invalid or expired', async () => {
      const invalidToken = 'invalid.token';
      verifyRefreshToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(authService.refresh(invalidToken)).rejects.toMatchObject({
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });

      expect(User.findByPk).not.toHaveBeenCalled();
      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('should throw 401 if user is not found', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(authService.refresh(validRefreshToken)).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 401,
      });

      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('should rethrow unexpected errors from findByPk', async () => {
      const dbError = new Error('Database unavailable');
      User.findByPk.mockRejectedValue(dbError);

      await expect(authService.refresh(validRefreshToken)).rejects.toThrow(dbError);

      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('should use correct payload.id from token (not sub)', async () => {
      const customPayload = { id: 'custom-uuid' };
      verifyRefreshToken.mockReturnValue(customPayload);
      User.findByPk.mockResolvedValue(mockUser);

      await authService.refresh(validRefreshToken);

      expect(User.findByPk).toHaveBeenCalledWith('custom-uuid', expect.any(Object));
    });
  });
});
