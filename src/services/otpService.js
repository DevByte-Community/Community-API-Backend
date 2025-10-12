// src/services/otpService.js
const { client } = require('../utils/redisClient');
const createLogger = require('../utils/logger');
const crypto = require('crypto');
const logger = createLogger('OTP_SERVICE');

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_LENGTH = 6;

function generateOtp() {
  logger.info('generate opt code operation on');

  // Generate a cryptographically secure random number
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  const otp = crypto
    .randomInt(min, max + 1)
    .toString()
    .padStart(OTP_LENGTH, '0');

  return otp;
}

async function saveOtpForEmail(email, otp) {
  const key = `otp:${email.toLowerCase()}`;

  await client.setex(key, OTP_TTL_SECONDS, otp);
  logger.info(`OTP stored in Redis for ${email}`);
}

async function getOtpForEmail(email) {
  logger.info('retrieving opt code operation on');
  const key = `otp:${email.toLowerCase()}`;

  const otp = await client.get(key);
  return otp;
}

async function deleteOtpForEmail(email) {
  const key = `otp:${email.toLowerCase()}`;

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
