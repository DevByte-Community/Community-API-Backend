// tests/auth.service.unit.test.js
const bcrypt = require('bcrypt');
const { User } = require('../../models');
const { generateTokens } = require('../../utils/jwt');
const authService = require('../../services/authService');

jest.mock('bcrypt');
jest.mock('../../models', () => ({
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));
jest.mock('../../utils/jwt', () => ({
  generateTokens: jest.fn(),
}));

describe('AuthService', () => {
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
      expect(result).toHaveProperty('access_token', 'acc');
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

      const result = await authService.signin({ email: 'john@example.com', password: 'password123' });

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_pw');
      expect(result).toHaveProperty('access_token', 'acc');
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

  // UPDATE PASSWORD BY EMAIL ─────────────────────────────
  describe('updatePasswordByEmail', () => {
    it('should hash new password and update user', async () => {
      const mockUser = {
        email: 'user@example.com',
        save: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('new_hashed_pw');

      const result = await authService.updatePasswordByEmail('user@example.com', 'newPassword123');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockUser.password).toBe('new_hashed_pw');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error if user not found', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.updatePasswordByEmail('missing@example.com', 'newpass')).rejects.toThrow(
        'User not found'
      );
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
});
