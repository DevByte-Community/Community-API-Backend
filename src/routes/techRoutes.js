const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  createTech,
  getAllTechs,
  getTechById,
  updateTech,
  deleteTech
} = require('../controllers/techController');

const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
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
 *           description: MinIO stored path or public URL (bucket/object.ext)
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "9a1f5f4a-1234-4a4c-8f4e-2a1b3c4d5e6f"
 *         name: "React"
 *         icon: "tech-icons/uuid.png"
 *         description: "A javascript UI library"
 *         createdAt: "2025-11-01T12:00:00.000Z"
 *         updatedAt: "2025-11-01T12:00:00.000Z"
 *
 *     NewTech:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *       required:
 *         - name
 *       example:
 *         name: "React"
 *         description: "JavaScript UI library"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *       example:
 *         success: false
 *         message: "Validation failed"
 *         errors: ["name is required"]
 */

/**
 * @swagger
 * /api/v1/techs:
 *   post:
 *     summary: Create a new tech
 *     tags: [Techs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tech created successfully
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
 *                   example: Tech created successfully
 *                 tech:
 *                   $ref: '#/components/schemas/Tech'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticateJWT, requireAdmin, upload.single('icon'), createTech);

/**
 * @swagger
 * /api/v1/techs:
 *   get:
 *     summary: Get all techs (optionally filter by name)
 *     tags: [Techs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter techs by name (case-insensitive)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results (optional)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination (optional)
 *     responses:
 *       200:
 *         description: Techs retrieved successfully
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
 *                   example: Techs retrieved successfully
 *                 techs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tech'
 */
router.get('/', authenticateJWT, getAllTechs);

/**
 * @swagger
 * /api/v1/techs/{id}:
 *   get:
 *     summary: Get a tech by ID
 *     tags: [Techs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tech ID
 *     responses:
 *       200:
 *         description: Tech retrieved successfully
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
 *                   example: Tech retrieved successfully
 *                 tech:
 *                   $ref: '#/components/schemas/Tech'
 *       404:
 *         description: Tech not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticateJWT, getTechById);

/**
 * @swagger
 * /api/v1/techs/{id}:
 *   put:
 *     summary: Update a tech (fields optional). Supports icon file upload for replacement.
 *     tags: [Techs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tech ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Tech updated successfully
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
 *                   example: Tech updated successfully
 *                 tech:
 *                   $ref: '#/components/schemas/Tech'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tech not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', authenticateJWT, requireAdmin, upload.single('icon'), updateTech);

/**
 * @swagger
 * /api/v1/techs/{id}:
 *   delete:
 *     summary: Delete a tech (admin only). Endpoint should verify there are no active relations before deletion.
 *     tags: [Techs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tech ID
 *     responses:
 *       200:
 *         description: Tech deleted successfully
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
 *                   example: Tech deleted successfully
 *       400:
 *         description: Cannot delete - active relations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tech not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticateJWT, requireAdmin, deleteTech);

module.exports = router;
