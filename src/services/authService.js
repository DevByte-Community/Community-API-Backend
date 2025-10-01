// services/authService.js
const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');
const { User } = require('../models');
const { generateTokens } = require('../utils/jwt');
const logger = require('../utils/logger');
const redisClient = require("../config/redis.js"); // setup redis client
const SALT_ROUNDS = 10;

class AuthService {
  async signup({ fullname, email, password }) {
    // ---- Here i VALIDATES THE REQUEST EVEN BEFORE IT REACHES MY SERVICE ----
    if (!fullname || fullname.trim() === '') {
      throw new Error('Fullname is required');
    }

    if (!email || email.trim() === '') {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (!password || password.trim() === '') {
      throw new Error('Password is required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

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

async logoutUser(refreshToken) {
  if (!refreshToken) {
    throw new Error('No refresh token provided');
  }

  // Blacklist refresh token in Redis with expiry of 7d
  await redisClient.setEx(`bl_rt_${refreshToken}`, 604800, 'blacklisted');

  return { success: true, message: 'Logged out successfully' };
}
}

module.exports = new AuthService();
