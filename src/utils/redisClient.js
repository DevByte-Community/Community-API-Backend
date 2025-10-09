// src/utils/redisClient.js
const Redis = require('ioredis');
const createLogger = require('./logger');
const logger = createLogger('REDIS_CLIENT');

let client;

if (process.env.NODE_ENV !== 'test') {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  client = new Redis(redisUrl);

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
} else {
  // 🧪 Mock Redis client during tests to avoid connection errors
  logger.warn('🧪 Skipping Redis connection in test environment');

  client = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 'OK',
    on: () => {},
    quit: async () => {},
  };
}

module.exports = { client };
