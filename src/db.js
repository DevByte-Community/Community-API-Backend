require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'localhost',          // if your Node app is running locally
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// Test the connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL");

    // Run a simple query
    const res = await client.query('SELECT NOW()');
    console.log("🕒 Current time from DB:", res.rows[0]);

    client.release();
  } catch (err) {
    console.error("❌ DB connection error:", err);
  }
})();

module.exports = pool;
