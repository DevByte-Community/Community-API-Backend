// src/utils/redisClient.js
const Redis = require('ioredis');
const createLogger = require('./logger');
const logger = createLogger('REDIS_CLIENT');

const redisUrl = process.env.REDIS_URL;
const client = new Redis(redisUrl);

client.on('connect', () => {
  logger.info(`✅ Connected to Redis at ${redisUrl}`);
});

client.on('ready', () => {
  logger.info('✅ Redis is ready to use');
});

client.on('error', (err) => {
  logger.error(`❌ Redis connection error: ${err.message}`);
});

client.on('end', () => {
  logger.warn('⚠️ Redis connection closed');
});

(async () => {
  try {
    await client.ping();
    logger.info('✅ Redis ping successful');
  } catch (err) {
    logger.error(`❌ Redis ping failed: ${err.message}`);
  }
})();

module.exports = {
  client,
  disconnect: async () => {
    await client.quit();
  },
};
