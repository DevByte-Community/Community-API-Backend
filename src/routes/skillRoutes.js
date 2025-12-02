const express = require('express');
const {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
} = require('../controllers/skillController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/v1/skills:
 *   get:
 *     summary: Get all skills with pagination
 *     description: Retrieve a paginated list of all skills in the system.
 *     tags: [Skills]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of skills per page (max 100)
 *     responses:
 *       200:
 *         description: Skills retrieved successfully
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
 *                   example: Skills retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: 123e4567-e89b-12d3-a456-426614174000
 *                       name:
 *                         type: string
 *                         example: JavaScript
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: Programming language for web development
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-01-15T10:30:00.000Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-01-20T14:45:00.000Z
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     totalCount:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Bad request - Invalid pagination parameters
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
 *                   example: Page must be at least 1
 *             example:
 *               success: false
 *               message: Page must be at least 1
 */
router.get('/', getAllSkills);

/**
 * @swagger
 * /api/v1/skills/{id}:
 *   get:
 *     summary: Get a single skill by ID
 *     description: Retrieve a specific skill by its UUID.
 *     tags: [Skills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Skill UUID
 *     responses:
 *       200:
 *         description: Skill retrieved successfully
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
 *                   example: Skill retrieved successfully
 *                 skill:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     name:
 *                       type: string
 *                       example: JavaScript
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: Programming language for web development
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-15T10:30:00.000Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-20T14:45:00.000Z
 *             example:
 *               success: true
 *               message: Skill retrieved successfully
 *               skill:
 *                 id: 123e4567-e89b-12d3-a456-426614174000
 *                 name: JavaScript
 *                 description: Programming language for web development
 *                 createdAt: 2025-01-15T10:30:00.000Z
 *                 updatedAt: 2025-01-20T14:45:00.000Z
 *       404:
 *         description: Skill not found
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
 *                   example: Skill not found
 *             example:
 *               success: false
 *               message: Skill not found
 */
router.get('/:id', getSkillById);

/**
 * @swagger
 * /api/v1/skills:
 *   post:
 *     summary: Create a new skill (Admin/Root only)
 *     description: Create a new skill. Requires admin or root authentication.
 *     tags: [Skills]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: JavaScript
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 example: Programming language for web development
 *     responses:
 *       201:
 *         description: Skill created successfully
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
 *                   example: Skill created successfully
 *                 skill:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     name:
 *                       type: string
 *                       example: JavaScript
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: Programming language for web development
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-15T10:30:00.000Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-15T10:30:00.000Z
 *             example:
 *               success: true
 *               message: Skill created successfully
 *               skill:
 *                 id: 123e4567-e89b-12d3-a456-426614174000
 *                 name: JavaScript
 *                 description: Programming language for web development
 *                 createdAt: 2025-01-15T10:30:00.000Z
 *                 updatedAt: 2025-01-15T10:30:00.000Z
 *       400:
 *         description: Bad request - Validation error
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
 *                   example: Validation failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - Skill name must be at least 2 characters long
 *             example:
 *               success: false
 *               message: Validation failed
 *               errors:
 *                 - Skill name must be at least 2 characters long
 *       401:
 *         description: Unauthorized
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
 *                   example: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *             example:
 *               success: false
 *               message: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *       403:
 *         description: Forbidden - Admin/Root access required
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
 *                   example: Insufficient permissions. Minimum required role: ADMIN
 *             example:
 *               success: false
 *               message: Insufficient permissions. Minimum required role: ADMIN
 *       409:
 *         description: Conflict - Skill with this name already exists
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
 *                   example: Skill with this name already exists
 *             example:
 *               success: false
 *               message: Skill with this name already exists
 */
router.post('/', authenticateJWT, requireAdmin, createSkill);

/**
 * @swagger
 * /api/v1/skills/{id}:
 *   patch:
 *     summary: Update an existing skill (Admin/Root only)
 *     description: Update a skill's name or description. Requires admin or root authentication.
 *     tags: [Skills]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Skill UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: TypeScript
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 example: Typed superset of JavaScript
 *     responses:
 *       200:
 *         description: Skill updated successfully
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
 *                   example: Skill updated successfully
 *                 skill:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     name:
 *                       type: string
 *                       example: TypeScript
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: Typed superset of JavaScript
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-15T10:30:00.000Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-20T14:45:00.000Z
 *             example:
 *               success: true
 *               message: Skill updated successfully
 *               skill:
 *                 id: 123e4567-e89b-12d3-a456-426614174000
 *                 name: TypeScript
 *                 description: Typed superset of JavaScript
 *                 createdAt: 2025-01-15T10:30:00.000Z
 *                 updatedAt: 2025-01-20T14:45:00.000Z
 *       400:
 *         description: Bad request - Validation error
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
 *                   example: Validation failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - At least one field must be provided
 *             example:
 *               success: false
 *               message: Validation failed
 *               errors:
 *                 - At least one field must be provided
 *       401:
 *         description: Unauthorized
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
 *                   example: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *             example:
 *               success: false
 *               message: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *       403:
 *         description: Forbidden - Admin/Root access required
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
 *                   example: Insufficient permissions. Minimum required role: ADMIN
 *             example:
 *               success: false
 *               message: Insufficient permissions. Minimum required role: ADMIN
 *       404:
 *         description: Skill not found
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
 *                   example: Skill not found
 *             example:
 *               success: false
 *               message: Skill not found
 *       409:
 *         description: Conflict - Skill with this name already exists
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
 *                   example: Skill with this name already exists
 *             example:
 *               success: false
 *               message: Skill with this name already exists
 */
router.patch('/:id', authenticateJWT, requireAdmin, updateSkill);

/**
 * @swagger
 * /api/v1/skills/{id}:
 *   delete:
 *     summary: Delete a skill (Admin/Root only)
 *     description: Permanently delete a skill. Requires admin or root authentication.
 *     tags: [Skills]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Skill UUID
 *     responses:
 *       200:
 *         description: Skill deleted successfully
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
 *                   example: Skill deleted successfully
 *             example:
 *               success: true
 *               message: Skill deleted successfully
 *       401:
 *         description: Unauthorized
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
 *                   example: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *             example:
 *               success: false
 *               message: Authentication required. Provide a valid token via HttpOnly cookie access_token.
 *       403:
 *         description: Forbidden - Admin/Root access required
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
 *                   example: Insufficient permissions. Minimum required role: ADMIN
 *             example:
 *               success: false
 *               message: Insufficient permissions. Minimum required role: ADMIN
 *       404:
 *         description: Skill not found
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
 *                   example: Skill not found
 *             example:
 *               success: false
 *               message: Skill not found
 */
router.delete('/:id', authenticateJWT, requireAdmin, deleteSkill);

module.exports = router;
