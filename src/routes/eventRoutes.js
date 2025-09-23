/**
 * Member Routes
 * -------------
 * Defines API endpoints for community events:
 * - GET /api/events
 * - POST /api/events
 */

const express = require('express');
const { getEvents, createEvent } = require('../controllers/eventController');

const router = express.Router();

router.get('/', getEvents);
router.post('/', createEvent);

module.exports = router;
