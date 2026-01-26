const express = require('express');
const { getDashboardMetrics } = require('../controllers/metricsController');

const router = express.Router();

router.get('/dashboard', getDashboardMetrics);

module.exports = router;