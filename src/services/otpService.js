// src/services/otpService.js
const { client } = require('../utils/redisClient');
const createLogger = require('../utils/logger');
const logger = createLogger('OTP_SERVICE');

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

function generateOtp() {
  logger.info('generate opt code operation on');
  return Math.floor(100000 + Math.random() * 900000).toString();
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
