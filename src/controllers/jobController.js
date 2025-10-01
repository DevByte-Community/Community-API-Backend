/**
 * Job Controller
 * --------------
 * Handles job and collaboration postings:
 * - Listing jobs/opportunities
 * - Creating new postings
 * - Future: Categories (full-time, freelance, collab) and contact links
 */

// GET all jobs

 const getJobs = (req, res) => {
  res.json({ message: 'List of jobs (to be implemented)' });
};

// POST new job

 const createJob = (req, res) => {
  res.json({ message: 'Job posting creation (to be implemented)' });
};

module.exports = {
  getJobs,
  createJob
};