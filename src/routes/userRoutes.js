/**
 * User Routes
 * -------------
 * Defines API endpoints for community users:
 * - GET /api/users
 * - GET /api/users/:id
 * - POST /api/users
 */

const express = require('express');
const { getUsers, createUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', getUsers);
router.post('/', createUser);

module.exports = router;