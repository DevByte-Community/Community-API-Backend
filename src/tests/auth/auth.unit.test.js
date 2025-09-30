// tests/auth.unit.test.js
jest.mock('../../models', () => ({ User: { create: jest.fn() } }));
jest.mock('bcrypt');
jest.mock('../../utils/jwt', () => ({
  generateTokens: () => ({ accessToken: 'a', refreshToken: 'r' }),
}));

const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');
const AuthService = require('../../services/authService');
const { User } = require('../../models');

describe('AuthService.signup (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockResolvedValue({
      id: 1,
      fullname: 'Test',
      email: 'test@example.com',
      role: 'USER',
    });

    const result = await AuthService.signup({
      fullname: 'Test',
      email: 'test@example.com',
      password: '12345678',
    });

    expect(result).toHaveProperty('success', true);
    expect(result.user.email).toBe('test@example.com');
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalled();
  });

  it('should throw error if email already exists (UniqueConstraintError)', async () => {
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockRejectedValue(new UniqueConstraintError());

    await expect(
      AuthService.signup({
        fullname: 'Test',
        email: 'duplicate@example.com',
        password: '12345678',
      })
    ).rejects.toThrow('Email already registered.');
  });

  it('should throw error if fullname is missing', async () => {
    await expect(
      AuthService.signup({
        email: 'missingname@example.com',
        password: '12345678',
      })
    ).rejects.toThrow('Fullname is required');
  });

  it('should throw error if email is missing', async () => {
    await expect(
      AuthService.signup({
        fullname: 'No Email',
        password: '12345678',
      })
    ).rejects.toThrow('Email is required');
  });

  it('should throw error if email format is invalid', async () => {
    await expect(
      AuthService.signup({
        fullname: 'Bad Email',
        email: 'not-an-email',
        password: '12345678',
      })
    ).rejects.toThrow('Invalid email format');
  });

  it('should throw error if password is missing', async () => {
    await expect(
      AuthService.signup({
        fullname: 'No Password',
        email: 'nopass@example.com',
      })
    ).rejects.toThrow('Password is required');
  });

  it('should throw error if password is too short', async () => {
    await expect(
      AuthService.signup({
        fullname: 'Short Pass',
        email: 'short@example.com',
        password: '123', // too short
      })
    ).rejects.toThrow('Password must be at least 6 characters');
  });
});
