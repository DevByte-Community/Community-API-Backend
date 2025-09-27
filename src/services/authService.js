// services/authService.js
const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user');
const { generateTokens } = require('../utils/jwt');
const logger = require('../utils/logger');


const SALT_ROUNDS = 10;

class AuthService {
  async signup({ fullname, email, password }) {
    // Here i check if email already exists (fast check)
    // const existingUser = await User.findOne({ where: { email } });
    // if (existingUser) {
    //   const error = new Error('Email already registered.');
    //   error.statusCode = 409;
    //   throw error;
    // }

    // Here i hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      // Here i create user
      const user = await User.create({
        fullname,
        email,
        password_hash,
        roles: ['USER'],
      });

      // Here i generate JWT & refresh token
      const { accessToken, refreshToken } = generateTokens(user);

      return {
        message: 'User registered successfully',
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          roles: user.roles,
          created_at: user.createdAt,
        },
      };
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        const error = new Error('Email already registered.');
        error.statusCode = 409;
        throw error;
      }
      logger.error(`Signup failed for email=${email} - ${err.message}`);
      const status = err.statusCode || 500;
      throw new Error(err.message).withStatus(status) // Here i rethrow other errors
    }
  }
}

module.exports = new AuthService();
