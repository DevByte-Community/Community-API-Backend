const path = require('path');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../config/config.js'))[env];
const createLogger = require('./utils/logger');

const logger = createLogger('DB_CONFIG');

// Load different env files depending on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging !== undefined ? config.logging : false, // Disable SQL query logging
  });
}

// Test the connection
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await sequelize.authenticate();
      logger.info('✅ Connected to PostgreSQL via Sequelize');
    } catch (err) {
      logger.warn('❌ Unable to connect:', err);
    }
  })();
}

module.exports = sequelize;
