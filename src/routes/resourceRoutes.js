/**
 * Member Routes
 * -------------
 * Defines API endpoints for community Learning Hub resources:
 * - GET /api/resources
 * - POST /api/resources
 */

const express = require("express");
const {
  getResources,
  createResource,
} = require("../controllers/resourceController");

const router = express.Router();

router.get("/", getResources);
router.post("/", createResource);

module.exports = router;
