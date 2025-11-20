const techService = require('../services/TechService');
const Validator = require('../utils/index');
const { createTechSchema } = require('../utils/validator');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');

const logger = createLogger('TECH_CONTROLLER');

/**
 * Create a new tech
 * @route POST /api/v1/techs
 * @access Public or Private
 */
const createTech = asyncHandler(async (req, res) => {
    try {
        const { _value, errorResponse } = Validator.validate(createTechSchema, req.body);
        if (errorResponse) return res.status(400).json(errorResponse);

        const iconFile = req.file || null;

        const result = await techService.createTech(_value, iconFile);

        logger.info(`Tech created: ${_value.name}`);

        return res.status(201).json({
            message: result.message,
            success: result.success,
            tech: result.tech,
        });
    } catch (err) {
        logger.error(`Tech creation failed: ${err.message}`);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
        });
    }
});

/**
 * Get all techs
 * @route GET /api/v1/techs
 */
const getAllTechs = asyncHandler(async (req, res) => {
  const searchTerm = req.query.search || '';
  const result = await techService.getAllTechs(searchTerm);

  logger.info(`Tech list retrieved successfully`);

  return res.status(200).json({
    success: true,
    message: result.message,
    techs: result.techs,
  });
});

/**
 * Get tech by ID
 * @route GET /api/v1/techs/:id
 */
const getTechById = asyncHandler(async (req, res) => {
  const techId = req.params.id;
  const result = await techService.getTechById(techId);

  logger.info(`Tech retrieved - id=${techId}`);

  return res.status(200).json({
    success: true,
    message: result.message,
    tech: result.tech,
  });
});

/**
 * Update a tech
 * @route PUT /api/v1/techs/:id
 */
const updateTech = asyncHandler(async (req, res) => {
    try {
        const techId = req.params.id;
        const iconFile = req.file || null;

        const result = await techService.updateTech(techId, req.body, iconFile);

        logger.info(`Tech updated: ${techId}`);

        return res.status(200).json({
            message: result.message,
            success: result.success,
            tech: result.tech,
        });
    } catch (err) {
        logger.error(`Tech update failed: ${err.message}`);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
        });
    }
});

/**
 * Delete a tech
 * @route DELETE /api/v1/techs/:id
 */
const deleteTech = asyncHandler(async (req, res) => {
  const techId = req.params.id;
  const result = await techService.deleteTech(techId);

  logger.info(`Tech deleted successfully - id=${techId}`);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  createTech,
  getAllTechs,
  getTechById,
  updateTech,
  deleteTech,
};
