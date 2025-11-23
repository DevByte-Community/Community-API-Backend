const express = require('express');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { getMyPreferences, updateMyPreferences } = require('../controllers/preferenceController');

const router = express.Router();

/**
 * @swagger
 * /api/v1/users/me/preferences:
 *   get:
 *     summary: Get current user's preferences
 *     description: Returns the current authenticated user's preference settings.
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 visibility:
 *                   type: boolean
 *                   example: true
 *                   description: Whether the user's profile is public (true) or private (false).
 *                 notification:
 *                   type: boolean
 *                   example: true
 *                   description: Enable/disable in-app & push notifications.
 *                 newsletter:
 *                   type: boolean
 *                   example: false
 *                   description: Whether the user is subscribed to marketing emails.
 *                 appearance:
 *                   type: string
 *                   example: dark
 *                   enum: [light, dark, system]
 *                   description: UI theme preference.
 *                 language:
 *                   type: string
 *                   example: en
 *                   description: ISO 639-1 language code.
 *                 timezone:
 *                   type: string
 *                   example: Africa/Douala
 *                   description: IANA timezone identifier.
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-11-17T19:36:00Z
 *       401:
 *         description: Unauthorized - User not authenticated or invalid token
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
 *                   example: Missing or invalid authentication token
 */
router.get('/preferences', authenticateJWT, getMyPreferences);

/**
 * @swagger
 * /api/v1/users/me/preferences:
 *   patch:
 *     summary: Update current user's preferences
 *     description: Update one or more of the authenticated user's preference fields.
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibility:
 *                 type: boolean
 *                 example: true
 *               notification:
 *                 type: boolean
 *                 example: false
 *               newsletter:
 *                 type: boolean
 *                 example: true
 *               appearance:
 *                 type: string
 *                 enum: [light, dark, system]
 *                 example: system
 *               language:
 *                 type: string
 *                 example: fr
 *               timezone:
 *                 type: string
 *                 example: Europe/Paris
 *     responses:
 *       200:
 *         description: Preferences updated
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
 *                   example: Preferences updated
 *                 preferences:
 *                   type: object
 *                   properties:
 *                     visibility:
 *                       type: boolean
 *                       example: true
 *                     notification:
 *                       type: boolean
 *                       example: false
 *                     newsletter:
 *                       type: boolean
 *                       example: true
 *                     appearance:
 *                       type: string
 *                       enum: [light, dark, system]
 *                       example: dark
 *                     language:
 *                       type: string
 *                       example: en
 *                     timezone:
 *                       type: string
 *                       example: Africa/Douala
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-17T19:40:00Z
 *       400:
 *         description: Validation error (invalid field value or payload)
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
 *                   example: "appearance must be one of: light, dark, system"
 *       401:
 *         description: Unauthorized - User not authenticated or invalid token
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
 *                   example: Missing or invalid authentication token
 */
router.patch('/preferences', authenticateJWT, updateMyPreferences);

module.exports = router;
