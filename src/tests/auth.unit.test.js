// tests/auth.unit.test.js
const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');
const AuthService = require('../src/services/authService');
const User = require('../src/models/user');

jest.mock('../src/models/user'); // Here is my mock Sequelize model
jest.mock('bcrypt');

describe('AuthService.signup (unit)', () => {
  it('should create a new user successfully', async () => {
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockResolvedValue({ id: 1, fullname: 'Test', email: 'test@example.com', role: 'USER' });

    const result = await AuthService.signup({ fullname: 'Test', email: 'test@example.com', password: '12345678' });

    expect(result).toHaveProperty('success', true);
    expect(result.user.email).toBe('test@example.com');
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalled();
  });

  it('should throw error if email already exists (UniqueConstraintError)', async () => {
    bcrypt.hash.mockResolvedValue('hashedpw');
    User.create.mockRejectedValue(new UniqueConstraintError());

    await expect(
      AuthService.signup({ fullname: 'Test', email: 'duplicate@example.com', password: '12345678' })
    ).rejects.toThrow('Email already registered.');
  });
});
