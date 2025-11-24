const express = require('express');

const {
  createSkill,
  updateSkill,
  getSkills,
  deleteSkill,
} = require('../controllers/skillController');

const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

/**
 * @swagger
 * /api/v1/admin/skills:
 *   post:
 *     summary: Create a new skill (Admin Only)
 *     tags: [SKILL]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Java
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Skill successfully created
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
 *                   example: Skill successfully created
 *       400:
 *         description: Bad request (validation errors)
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
 *                   example: ["Name is required"]
 *       409:
 *         description: Conflict (Skill already registered)
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
 *                   example: Skill already registered
 *       500:
 *         description: Internal server error
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
 *                   example: Internal server error
 */
router.post('/skills', createSkill);

/**
 * @swagger
 * /api/v1/admin/skills/{id}:
 *   patch:
 *     summary: Update an existing skill (Admin Only)
 *     tags: [SKILL]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The UUID of the skill to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: JavaScript
 *               description:
 *                 type: string
 *                 example: A high-level programming language
 *     responses:
 *       200:
 *         description: Skill successfully updated
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
 *                   example: Skill successfully updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 5d21e8f3-1c9a-4c4b-9c42-b8b4d9e1ef3f
 *                     name:
 *                       type: string
 *                       example: JavaScript
 *                     description:
 *                       type: string
 *                       example: A high-level programming language
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-08T12:30:45.123Z
 *       400:
 *         description: Bad request (for example, validation errors)
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
 *                   example: ["Name is required"]
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
 *       409:
 *         description: Conflict (for example, new name already exists)
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
 *                   example: Skill name already exists
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to update skill due to a server error
 */
router.patch('/skills/:id', updateSkill);

/**
 * @swagger
 * /api/v1/admin/skills:
 *   get:
 *     summary: Retrieve a list of all skills (Admin Only) with pagination
 *     tags: [SKILL]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The maximum number of items per page.
 *     responses:
 *       200:
 *         description: A paginated list of skills.
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
 *                   type: object
 *                   properties:
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: 5d21e8f3-1c9a-4c4b-9c42-b8b4d9e1ef3f
 *                           name:
 *                             type: string
 *                             example: JavaScript
 *                           description:
 *                             type: string
 *                             example: Programming language for web development
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-08T10:45:12.123Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         itemsPerPage:
 *                           type: integer
 *                           example: 10
 *       400:
 *         description: Bad request (Invalid query parameters)
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
 *                   example: Invalid page or limit parameter
 *       401:
 *         description: Unauthorized (Admin access required)
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
 *                   example: Access denied. Admin privileges required
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to retrieve skills due to a server error
 */
router.get('/skills', getSkills);

/**
 * @swagger
 * /api/v1/admin/skills/{id}:
 *   delete:
 *     summary: Delete a skill by ID (Admin Only)
 *     tags: [SKILL]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The UUID of the skill to delete
 *     responses:
 *       200:
 *         description: Skill successfully deleted
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
 *       400:
 *         description: Bad request (Invalid ID format)
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
 *                   example: Invalid skill ID format
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
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to delete skill due to a server error
 */

router.delete('/skills/:id', deleteSkill);

module.exports = router;
