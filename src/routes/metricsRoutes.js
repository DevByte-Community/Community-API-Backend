const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/metricsController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');
const adminAuditLogger = require('../middleware/adminAuditMiddleware');


/**
 * @swagger
 * /api/v1/metrics/dashboard:
 *   get:
 *     summary: Retrieve core dashboard metrics (Admin only)
 *     description: >
 *        Returns aggregated dashboard metrics.
 *        Requires authentication and Admin role.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
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


router.get('/dashboard', authenticateJWT, requireAdmin, adminAuditLogger, getDashboardMetrics);

module.exports = router;