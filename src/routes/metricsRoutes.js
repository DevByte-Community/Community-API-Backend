const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/metricsController');



/**
 * @swagger
 * /api/v1/metrics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Returns counts and trends for members, projects, events, and blog posts
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardMetricsResponse'
 *       500:
 *         description: Internal server error
 */

router.get('/dashboard', getDashboardMetrics);

module.exports = router;