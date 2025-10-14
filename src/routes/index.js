/**
 * Router entry point
 * -------------
 * Main router combining all feature routes
 */

const express = require('express');
const memberRoutes = require('./memberRoutes');
const eventRoutes = require('./eventRoutes');
const resourceRoutes = require('./resourceRoutes');
const projectRoutes = require('./projectRoutes');
const jobRoutes = require('./jobRoutes');
const blogRoutes = require('./blogRoutes');
const userRoutes = require('./userRoutes');
const dbRoutes = require('./dbRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/members', memberRoutes);
router.use('/events', eventRoutes);
router.use('/resources', resourceRoutes);
router.use('/projects', projectRoutes);
router.use('/jobs', jobRoutes);
router.use('/blogs', blogRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);

// DB test route
router.use('/test', dbRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API root works ✅' });
});

module.exports = router;
