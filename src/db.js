require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: 'postgres',
    logging: false, // disable noisy SQL logs
  }
);

// Test the connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL via Sequelize');
  } catch (err) {
    console.error('❌ DB connection error:', err);
  }
})();

module.exports = sequelize;
