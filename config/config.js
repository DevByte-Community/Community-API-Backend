const path = require('path');
const dotenv = require('dotenv');
const createLogger = require('../src/utils/logger');

const logger = createLogger('CONFIG');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
logger.info('👉 NODE_ENV:', process.env.NODE_ENV, 'loading', envFile);
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL', // Use connection string
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  test: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL', // Use connection string
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
