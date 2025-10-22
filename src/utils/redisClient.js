// src/utils/redisClient.js
const Redis = require('ioredis');
const createLogger = require('./logger');
const logger = createLogger('REDIS_CLIENT');

let client;

/**
 * Initialise le client Redis avec l'URL fournie ou celle de l'environnement
 * @param {string} url - URL de connexion Redis (optionnel)
 * @returns {Redis} Instance du client Redis
 */
const initializeRedisClient = (url) => {
  const redisUrl = url || process.env.REDIS_URL;
  const isTls = redisUrl.search('localhost') === -1;

  if (!redisUrl) {
    logger.warn('⚠️ REDIS_URL not defined, using default localhost:6379');
  }

  if (client) {
    logger.info('Redis client already exists, returning existing instance');
    return client;
  }

  client = new Redis(redisUrl, {
    tls: isTls,
    // Options pour éviter les reconnections infinies en tests
    retryStrategy: (times) => {
      if (process.env.NODE_ENV === 'test' && times > 3) {
        logger.warn('Redis retry limit reached in test mode');
        return null; // Arrêter les tentatives de reconnection
      }

      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: process.env.NODE_ENV === 'test' ? 1 : null,
    lazyConnect: process.env.NODE_ENV === 'test', // Ne pas se connecter immédiatement en test
  });

  client.on('connect', () => {
    logger.info(`✅ Connected to Redis at ${redisUrl}`);
  });

  client.on('ready', () => {
    logger.info('✅ Redis is ready to use');
  });

  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      logger.error(`❌ Redis connection error: ${err.message}`);
    }
  });

  client.on('end', () => {
    logger.warn('⚠️ Redis connection closed');
  });

  return client;
};

// Initialiser automatiquement sauf en environnement de test
if (process.env.NODE_ENV !== 'test') {
  client = initializeRedisClient();

  // Ping uniquement en non-test
  (async () => {
    try {
      await client.ping();
      logger.info('✅ Redis ping successful');
    } catch (err) {
      logger.error(`❌ Redis ping failed: ${err.message}`);
    }
  })();
}

module.exports = {
  get client() {
    if (!client) {
      client = initializeRedisClient();
    }
    return client;
  },
  initializeRedisClient,
  disconnect: async () => {
    if (client) {
      await client.quit();
      client = null;
    }
  },
};
