// services/authService.js
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { generateTokens } = require('../utils/jwt');

const SALT_ROUNDS = 10;

class AuthService {
  async signup({ name, email, password }) {
    // check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('Email already registered.');
      error.statusCode = 409;
      throw error;
    }

    // hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // create user
    const user = await User.create({
      name,
      email,
      password_hash,
      roles: ['USER'],
    });

    // generate JWT & refresh token
    const { accessToken, refreshToken } = generateTokens(user);

    return {
      message: 'User registered successfully',
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        created_at: user.createdAt,
      },
    };
  }
}

module.exports = new AuthService();
