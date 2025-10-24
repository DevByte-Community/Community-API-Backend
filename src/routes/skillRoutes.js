const express = require('express');

const skillController = require('../controllers/skillController');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/skills:
 *  post:
 *   summary: Create a new skill (Admin Only)
 *   tags: [SKILL]
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: Java
 *             description:
 *               type: string
 *   responses:
 *     201:
 *       description: Skill sucessfully created
 *     400:
 *       description: Bad request (e.g., validation errors)
 *     409:
 *       description: Conflict (e.g., Skill already registered)
 *     500:
 *       description: Internal server error
 */
router.post('/skills', skillController.create);

/**
 * @swagger
 * /api/v1/admin/skills/{id}:
 *   put:
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
 *                 example: Javascript
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Skill successfully updated
 *       400:
 *         description: Bad request (for example validation errors)
 *       404:
 *         description: Skill not found
 *       409:
 *         description: Conflict (for example new name already exists)
 *       500:
 *         description: Internal server error
 */
router.put('/skills/:id', skillController.update);

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
 *                   example: Skills retrieved successfully.
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: Javascript
 *                       description:
 *                         type: string
 *                         example: Programming language
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Internal server error
 */
router.get('/skills', skillController.getAllSkills);

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
 *       400:
 *         description: Bad request (Invalid ID format)
 *       404:
 *         description: Skill not found
 *       500:
 *         description: Internal server error
 */
router.delete('/skills/:id', skillController.delete);

module.exports = router;
