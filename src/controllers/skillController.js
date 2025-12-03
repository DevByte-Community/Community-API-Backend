// controllers/skillController.js
const {
  getAllSkills,
  getSkillById,
  createSkill,
  batchCreateSkills,
  updateSkill,
  deleteSkill,
} = require('../services/skillService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');
const {
  paginationQuerySchema,
  createSkillSchema,
  updateSkillSchema,
  batchCreateSkillsSchema,
} = require('../utils/validator');
const Validator = require('../utils/index');

const logger = createLogger('SKILL_CONTROLLER');

/**
 * Get all skills with pagination
 * @route GET /api/v1/skills
 * @access Public
 */
const getAllSkillsController = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = paginationQuerySchema.validate(req.query);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { page, pageSize } = value;

  // Get paginated skills
  const result = await getAllSkills({ page, pageSize });

  logger.info(`Retrieved skills list - page ${page}, pageSize ${pageSize}`);

  return res.status(200).json({
    success: true,
    message: 'Skills retrieved successfully',
    ...result,
  });
});

/**
 * Get a single skill by ID
 * @route GET /api/v1/skills/:id
 * @access Public
 */
const getSkillByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const skill = await getSkillById(id);

  return res.status(200).json({
    success: true,
    message: 'Skill retrieved successfully',
    skill,
  });
});

/**
 * Create a new skill
 * @route POST /api/v1/skills
 * @access Private (Admin/Root only)
 */
const createSkillController = asyncHandler(async (req, res) => {
  // Validate request body
  const { _value, errorResponse } = Validator.validate(createSkillSchema, req.body);
  if (errorResponse) {
    throw new ValidationError(errorResponse.message || 'Validation failed');
  }

  // Set creator to current user (admin/root creating the skill)
  const createdBy = req.user?.id || null;
  const skill = await createSkill(_value, createdBy);

  logger.info(`Skill created: ${skill.id} - ${skill.name} by user: ${createdBy}`);

  return res.status(201).json({
    success: true,
    message: 'Skill created successfully',
    skill,
  });
});

/**
 * Batch create multiple skills
 * @route POST /api/v1/skills/batch
 * @access Private (Admin/Root only)
 */
const batchCreateSkillsController = asyncHandler(async (req, res) => {
  // Validate request body
  const { _value, errorResponse } = Validator.validate(batchCreateSkillsSchema, req.body);
  if (errorResponse) {
    throw new ValidationError(errorResponse.message || 'Validation failed');
  }

  // Set creator to current user (admin/root creating the skills)
  const createdBy = req.user?.id || null;
  const result = await batchCreateSkills(_value.skills, createdBy);

  logger.info(
    `Batch created ${result.summary.created} skills, skipped ${result.summary.skipped}, errors: ${result.summary.errors} by user: ${createdBy}`
  );

  const statusCode = result.summary.errors > 0 ? 207 : 201; // 207 Multi-Status if partial success

  return res.status(statusCode).json({
    success: true,
    message: `Batch skill creation completed. Created: ${result.summary.created}, Skipped: ${result.summary.skipped}, Errors: ${result.summary.errors}`,
    ...result,
  });
});

/**
 * Update an existing skill
 * @route PATCH /api/v1/skills/:id
 * @access Private (Admin/Root only)
 */
const updateSkillController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { _value, errorResponse } = Validator.validate(updateSkillSchema, req.body);
  if (errorResponse) {
    throw new ValidationError(errorResponse.message || 'Validation failed');
  }

  const skill = await updateSkill(id, _value);

  logger.info(`Skill updated: ${id}`);

  return res.status(200).json({
    success: true,
    message: 'Skill updated successfully',
    skill,
  });
});

/**
 * Delete a skill
 * @route DELETE /api/v1/skills/:id
 * @access Private (Admin/Root only)
 */
const deleteSkillController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await deleteSkill(id);

  logger.info(`Skill deleted: ${id}`);

  return res.status(200).json({
    success: true,
    message: 'Skill deleted successfully',
  });
});

module.exports = {
  getAllSkills: getAllSkillsController,
  getSkillById: getSkillByIdController,
  createSkill: createSkillController,
  batchCreateSkills: batchCreateSkillsController,
  updateSkill: updateSkillController,
  deleteSkill: deleteSkillController,
};
