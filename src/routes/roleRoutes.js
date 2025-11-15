// routes/roleRoutes.js (or add to authRoutes.js)
const express = require('express');
const roleController = require('../controllers/roleController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/v1/roles/assign:
 *   post:
 *     summary: Assign a role to a user
 *     description: |
 *       Assign USER or ADMIN role to a user. Only ADMIN and ROOT can assign roles.
 *
 *       **Rules:**
 *       - ADMIN and ROOT can assign USER or ADMIN roles
 *       - Cannot downgrade own role
 *       - Cannot assign role higher than caller's role
 *     tags: [Authentication, Roles]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to assign role to
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *                 description: Role to assign (ROOT cannot be assigned via API)
 *                 example: ADMIN
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Role updated
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     email:
 *                       type: string
 *                       example: admin@devbyte.io
 *                     role:
 *                       type: string
 *                       example: ADMIN
 *       400:
 *         description: Bad request - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid role. Must be one of USER, ADMIN, ROOT
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Insufficient permissions. Only ADMIN or ROOT can assign ADMIN role.
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Target user not found
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.post('/assign', authenticateJWT, requireAdmin, roleController.assignRole);

module.exports = router;
