const express = require('express');
const {
  updateProfilePicture,
  updateProfile,
  getProfile,
} = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { handleMulterUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * @swagger 
 * /api/v1/users/profile/picture:
 *   patch:
 *     summary: Upload or update user profile picture
 *     description: Upload a profile picture for the authenticated user. The image will be stored in MinIO and the URL will be saved to the user's profile.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - profile_picture
 *             properties:
 *               profile_picture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (JPEG or PNG, max 5MB)
 *           encoding:
 *             profile_picture:
 *               contentType: image/jpeg, image/png
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
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
 *                   example: Profile picture updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     fullname:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *                     role:
 *                       type: string
 *                       enum: [USER, ADMIN]
 *                       example: USER
 *                     profilePicture:
 *                       type: string
 *                       example: devbyte-profile-pictures/profile_picture_123e4567_1234567890.jpg
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-12T12:00:00.000Z
 *       400:
 *         description: Bad request - No file uploaded or invalid file type
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
 *                   example: No file uploaded. Please provide a profile picture.
 *             examples:
 *               noFile:
 *                 summary: No file uploaded
 *                 value:
 *                   success: false
 *                   message: No file uploaded. Please provide a profile picture.
 *               invalidFileType:
 *                 summary: Invalid file type
 *                 value:
 *                   success: false
 *                   message: Invalid file type. Only JPEG and PNG images are allowed.
 *               fileTooLarge:
 *                 summary: File size exceeds limit
 *                 value:
 *                   success: false
 *                   message: File size exceeds the maximum limit of 5MB
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
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
 *                   example: Authentication required. Please provide a valid JWT token in the Authorization header.
 *             examples:
 *               noToken:
 *                 summary: No token provided
 *                 value:
 *                   success: false
 *                   message: Authentication required. Please provide a valid JWT token in the Authorization header.
 *               invalidFormat:
 *                 summary: Invalid token format
 *                 value:
 *                   success: false
 *                   message: Invalid authentication format. Use Authorization Bearer <token>
 *               tokenExpired:
 *                 summary: Token expired
 *                 value:
 *                   success: false
 *                   message: Token has expired. Please login again.
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   success: false
 *                   message: Invalid token. Please provide a valid JWT token.
 *               userNotFound:
 *                 summary: User no longer exists
 *                 value:
 *                   success: false
 *                   message: User associated with this token no longer exists.
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
 *                   example: User not found
 *       500:
 *         description: Internal server error - MinIO connection failure or database error
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
 *                   example: An error occurred while updating the profile picture
 */
router.patch(
  '/profile/picture',
  authenticateJWT,
  handleMulterUpload('profile_picture'),
  updateProfilePicture
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   patch:
 *     summary: Update user profile (fullname and email)
 *     description: Update the authenticated user's profile details such as fullname and email address. The endpoint validates email uniqueness before updating.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 example: jane.doe@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     fullname:
 *                       type: string
 *                       example: Jane Doe
 *                     email:
 *                       type: string
 *                       example: jane.doe@example.com
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-14T12:00:00.000Z
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
 *                   example: Invalid input. Please provide a valid fullname or email.
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       404:
 *         description: User not found
 *       409:
 *         description: Conflict - Email already in use
 *       500:
 *         description: Internal server error
 */
router.patch('/profile', authenticateJWT, updateProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile (id, fullname, role, email...)
 *     description: Get user's profile details such as id, fullname, roles, skills and email address. The endpoint validates access token.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Get profile successfully
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
 *                   example: Profile updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     fullname:
 *                       type: string
 *                       example: Jane Doe
 *                     email:
 *                       type: string
 *                       example: jane.doe@example.com
 *                     role:
 *                       type: string
 *                       example: USER
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "skill-uuid-123"
 *                       example: [ "skill-1", "skill-2", "skill-3" ]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-14T12:00:00.000Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-14T12:00:00.000Z
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
 *                   example: Invalid input. Please provide a valid fullname or email.
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       404:
 *         description: User not found
 *       409:
 *         description: Conflict - Email already in use
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateJWT, getProfile);

module.exports = router;
