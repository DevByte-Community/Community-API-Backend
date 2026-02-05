const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/metricsController');


/**
 * @swagger
 * /api/v1/metrics/dashboard:
 *   get:
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Dashboard metrics retrieved successfully
 *               activeMembers:
 *                 count: 1
 *                 trend: 0
 *                 description: Users active in last 7 days
 *               activeProjects:
 *                 count: 1
 *                 trend: 0
 *                 description: Projects updated in last 30 days
 *               upcomingEvents:
 *                 count: 0
 *                 trend: 0
 *                 description: Events starting in next 14 days
 *               blogPosts:
 *                 count: 1
 *                 trend: 0
 *                 description: Total published blog posts
 *               lastUpdated: 2026-02-05T16:59:20.636Z
 */


router.get('/dashboard', getDashboardMetrics);

module.exports = router;