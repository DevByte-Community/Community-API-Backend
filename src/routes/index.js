/**
 * Router entry point
 * -------------
 * Main router combining all feature routes
 */

const express = require("express");
const memberRoutes = require("./memberRoutes");
const eventRoutes = require("./eventRoutes");
const resourceRoutes = require("./resourceRoutes");
const projectRoutes = require("./projectRoutes");
const jobRoutes = require("./jobRoutes");
const blogRoutes = require("./blogRoutes");

const router = express.Router();

router.use("/members", memberRoutes);
router.use("/events", eventRoutes);
router.use("/resources", resourceRoutes);
router.use("/projects", projectRoutes);
router.use("/jobs", jobRoutes);
router.use("/blogs", blogRoutes);

module.exports = router;
