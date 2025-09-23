/**
 * Member Routes
 * -------------
 * Defines API endpoints for community members:
 * - GET /api/members
 * - POST /api/members
 */

const express = require('express');
const { getMembers, createMember } = require('../controllers/memberController');

const router = express.Router();

router.get('/', getMembers);
router.post('/', createMember);

module.exports = router;
