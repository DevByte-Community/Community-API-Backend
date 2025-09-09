/**
 * Resource Controller
 * -------------------
 * Handles Learning Hub resources:
 * - Fetching tutorials/articles/resources
 * - Adding new resources
 * - Future: Categories, search, and contributor metadata
 */

// GET all resources
export const getResources = (req, res) => {
  res.json({ message: "List of learning resources (to be implemented)" });
};

// POST new resource
export const createResource = (req, res) => {
  res.json({ message: "Resource creation (to be implemented)" });
};
