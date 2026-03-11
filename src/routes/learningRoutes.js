const express = require('express');
const {
  createLearning,
  getAllLearnings,
  getLearningById,
  updateLearning,
  deleteLearning,
  getMyLearnings,
} = require('../controllers/learningController');
const { authenticateJWT } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *   schemas:
 *     ValidationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Name cannot be empty", "Level must be valid"]
 *     Tech:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         icon:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *     Learning:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - level
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Node.js Basics"
 *         description:
 *           type: string
 *           example: "Learn Node.js fundamentals"
 *         contentUrl:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/content/video1"
 *         duration:
 *           type: integer
 *           nullable: true
 *           example: "150"
 *           description: Duration in minutes
 *         level:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced]
 *           example: "Beginner"
 *         techs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Tech'
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "user-id"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LearningUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Node.js Basics Full Video 33"
 *         description:
 *           type: string
 *           example: "Learn Node.js fundamentals"
 *         contentUrl:
 *           type: string
 *           example: "https://example.com/content/video1"
 *         duration:
 *           type: integer
 *           example: 1500
 *           description: Duration in minutes
 *         level:
 *           type: string
 *           enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *           example: "BEGINNER"
 *         techs:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["019c377f-9ad5-764d-8fd7-0e2702811f36"]
 *     LearningCreate:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - level
 *       properties:
 *         name:
 *           type: string
 *           example: "Node.js Basics"
 *         description:
 *           type: string
 *           example: "Learn Node.js fundamentals"
 *         contentUrl:
 *           type: string
 *           example: "https://example.com/content/video1"
 *         duration:
 *           type: integer
 *           example: 150
 *           description: Duration in minutes
 *         level:
 *           type: string
 *           enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *           example: "BEGINNER"
 *         techs:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["019c377f-9ad5-764d-8fd7-0e2702811f36"]
 */

/**
 * @swagger
 * /api/v1/learnings:
 *   post:
 *     summary: Create a new learning
 *     tags: [Learning]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearningCreate'
 *     responses:
 *       201:
 *         description: Learning created successfully
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
 *                   example: Learning created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Learning'
 */
router.post('/', authenticateJWT, createLearning);

/**
 * @swagger
 * /api/v1/learnings:
 *   get:
 *     summary: Get all learnings
 *     tags: [Learning]
 *     security: []
 *     responses:
 *       200:
 *         description: Learnings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Learning'
 */
router.get('/', getAllLearnings);

/**
 * @swagger
 * /api/v1/learnings/mine:
 *   get:
 *     summary: Get learnings of the authenticated user
 *     tags: [Learning]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User learnings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Learning'
 *       401:
 *         description: Unauthorized
 */
router.get('/mine', authenticateJWT, getMyLearnings);

/**
 * @swagger
 * /api/v1/learnings/{id}:
 *   get:
 *     summary: Get learning by ID
 *     tags: [Learning]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The learning ID
 *     responses:
 *       200:
 *         description: Learning retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Learning'
 *       404:
 *         description: Learning not found
 */
router.get('/:id', getLearningById);

/**
 * @swagger
 * /api/v1/learnings/{id}:
 *   patch:
 *     summary: Update a learning
 *     tags: [Learning]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The learning ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearningUpdate'
 *     responses:
 *       200:
 *         description: Learning updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Learning'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Learning not found
 */
router.patch('/:id', authenticateJWT, updateLearning);

/**
 * @swagger
 * /api/v1/learnings/{id}:
 *   delete:
 *     summary: Delete a learning
 *     tags: [Learning]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The learning ID
 *     responses:
 *       200:
 *         description: Learning deleted successfully
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
 *                   example: Learning deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Learning not found
 */
router.delete('/:id', authenticateJWT, deleteLearning);

module.exports = router;
