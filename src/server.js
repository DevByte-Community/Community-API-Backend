/**
 * Server Entry Point
 * ------------------
 * Starts the Express server.
 */

require('dotenv').config();
require('./db'); // Ensure DB connection is established

const app = require('./app');

const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });
console.log("👉 Loaded DB config:", {
  user: process.env.POSTGRES_USER,
  db: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT
});

app
  .listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
      process.exit(1);
    } else {
      throw err;
    }
  });
