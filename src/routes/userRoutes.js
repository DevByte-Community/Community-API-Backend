/**
 * User Routes
 * -------------
 * Defines API endpoints for community users:
 * - GET /api/users
 * - GET /api/users/:id
 * - POST /api/users
 * - POST /api/auth/logout
 */

const express = require("express");
const { getUsers, createUser } = require("../controllers/userController");
const { logout } = require("../controllers/authController");

const router = express.Router();

router.get("/", getUsers);
router.post("/", createUser);
router.post("/auth/logout", logout);

module.exports = router;
