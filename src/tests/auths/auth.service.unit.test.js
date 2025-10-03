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
});
