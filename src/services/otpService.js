// src/services/otpService.js
const crypto = require('crypto');
const { client } = require('../utils/redisClient');
const createLogger = require('../utils/logger');
const logger = createLogger('OTP_SERVICE');

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

// In-memory fallback store for test mode
const memoryStore = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtpForEmail(email, otp) {
  const key = `otp:${email.toLowerCase()}`;

  if (process.env.NODE_ENV === 'test') {
    memoryStore[key] = otp;
    logger.info(`[TEST MODE] OTP stored in memory for ${email}`);
    return;
  }

  await client.setex(key, OTP_TTL_SECONDS, otp);
  logger.info(`OTP stored in Redis for ${email}`);
}

async function getOtpForEmail(email) {
  const key = `otp:${email.toLowerCase()}`;

  if (process.env.NODE_ENV === 'test') {
    const otp = memoryStore[key];
    logger.info(`[TEST MODE] Retrieved OTP from memory for ${email}`);
    return otp || null;
  }

  const otp = await client.get(key);
  return otp; // null if missing
}

async function deleteOtpForEmail(email) {
  const key = `otp:${email.toLowerCase()}`;

  if (process.env.NODE_ENV === 'test') {
    delete memoryStore[key];
    logger.info(`[TEST MODE] OTP deleted from memory for ${email}`);
    return;
  }

  await client.del(key);
  logger.info(`OTP deleted from Redis for ${email}`);
}

module.exports = {
  generateOtp,
  saveOtpForEmail,
  getOtpForEmail,
  deleteOtpForEmail,
  OTP_TTL_SECONDS,
};
