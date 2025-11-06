/**
 * Server Entry Point
 * ------------------
 * Starts the Express server.
 */

require('dotenv').config();
require('./db'); // Ensure DB connection is established

const createLogger = require('./utils/logger');
const logger = createLogger('SERVER');
const { initializeBucket } = require('./utils/minioClient');

const app = require('./app');
const process = require('process');

const PORT = process.env.PORT || 4000;

logger.info('👉 Loaded DB config:', {
  databaseUrl: process.env.DATABASE_URL
    ? `${process.env.DATABASE_URL.slice(0, 20)}#####`
    : 'Not set',
});

// Initialize MinIO bucket on startup
(async () => {
  try {
    await initializeBucket();
    logger.info('✅ MinIO bucket initialized successfully');
  } catch (error) {
    logger.warn(`⚠️ Failed to initialize MinIO bucket: ${error.message}`);
  }
})();

app
  .listen(PORT, () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
    }
    throw err;
  });
