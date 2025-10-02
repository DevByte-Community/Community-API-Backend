// services/authService.js
const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');
const { User } = require('../models');
const { generateTokens } = require('../utils/jwt');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

class AuthService {
  async signup({ fullname, email, password }) {
    // Here i hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      // Here i create user
      const user = await User.create({
        fullname,
        email,
        password: password_hash,
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
      const error = new Error(err.message);
      error.statusCode = 500; // or use your "status" variable
      throw error;
    }
  }

  async signin({ email, password }) {
    // Here i find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }



    // Here i compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    try {
      // Here i generate JWT & refresh token
      const { accessToken, refreshToken } = generateTokens(user);

      return {
        message: 'User signed in successfully',
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
      logger.error(`Signin failed for email=${email} - ${err.message}`);
      const error = new Error(err.message);
      error.statusCode = 500; 
      throw error;
    }
  }
}

module.exports = new AuthService();
