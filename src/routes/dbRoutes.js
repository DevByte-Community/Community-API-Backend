const express = require('express');
const router = express.Router();
const pool = require('../db'); // import your pool

router.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      connected: true,
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error('DB test error:', err);
    res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

module.exports = router;
