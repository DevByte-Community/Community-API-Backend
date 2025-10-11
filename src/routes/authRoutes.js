const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request (e.g., validation errors)
 *       409:
 *         description: Conflict (e.g., email already registered)
 *       500:
 *         description: Internal server error
 */
router.post('/signup', authController.signup);

/**
 * @swagger
 * /api/v1/auth/signin:
 *   post:
 *     summary: Login user and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
router.post('/signin', authController.signin);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request an OTP for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully (or email not found)
 *       400:
 *         description: Bad request (e.g., missing email)
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and reset user password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - new_password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               otp:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or bad request
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', authController.verifyOtp);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password for authenticated user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - current_password
 *               - new_password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               current_password:
 *                 type: string
 *                 example: oldpassword123
 *               new_password:
 *                 type: string
 *                 example: newpassword456
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Bad request (validation errors)
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', authController.resetPassword);

// router.post('/refresh-token', authController.refreshToken);

module.exports = router;
