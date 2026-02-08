const {
  createLearning,
  getAllLearnings,
  getLearningById,
  getMyLearnings,
  updateLearning,
  deleteLearning,
} = require('../services/learningService');
const createLogger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/customErrors');
const {
  createLearningSchema,
  updateLearningSchema,
  learningQuerySchema,
  learningIdParamSchema,
} = require('../utils/validator');

const logger = createLogger('LEARNING_CONTROLLER');

/**
 * Create a new learning
 * @route POST /api/v1/learnings
 * @access Private (Authenticated users)
 */
const createLearningController = asyncHandler(async (req, res) => {
  const body = req.body || {};

  // Validate request body
  const { error, value } = createLearningSchema.validate(body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(`Validation error occurred when creating learning: ${errorMessages.join(', ')}`);
    throw new ValidationError('Validation failed', errorMessages);
  }

  // Create learning
  const learning = await createLearning(req.user, value);

  logger.info(`Learning created successfully by userId=${req.user.id}`);

  return res.status(201).json({
    success: true,
    message: 'Learning created successfully',
    data: learning,
  });
});

/**
 * Get all learnings with optional filters
 * @route GET /api/v1/learnings
 * @access Public
 */
const getAllLearningsController = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = learningQuerySchema.validate(req.query, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(`Validation error occurred when fetching learnings: ${errorMessages.join(', ')}`);
    throw new ValidationError('Validation failed', errorMessages);
  }

  const { page, pageSize, level, userId } = value;

  // Fetch learnings
  const result = await getAllLearnings({ page, pageSize, level, userId });

  logger.info(`Retrieved learnings list - page ${page}, pageSize ${pageSize}`);

  return res.status(200).json({
    success: true,
    message: 'Learnings retrieved successfully',
    ...result,
  });
});

/**
 * Get learnings created by authenticated user
 * @route GET /api/v1/learnings/mine
 * @access Private
 */
const getMyLearningsController = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const learnings = await getMyLearnings(userId);

  if (!learnings.length) {
    return res.status(200).json({
      success: true,
      message: 'You have not created any learnings yet',
      data: [],
    });
  }

  logger.info(`Retrieved learnings for userId=${userId}`);

  return res.status(200).json({
    success: true,
    message: 'Your learnings retrieved successfully',
    data: learnings,
  });
});


/**
 * Get a single learning by ID
 * @route GET /api/v1/learnings/:id
 * @access Public
 */
const getLearningByIdController = asyncHandler(async (req, res) => {
  // Validate learning ID
  const { error, value } = learningIdParamSchema.validate(req.params, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error(
      `Validation error occurred when fetching learning by ID: ${errorMessages.join(', ')}`
    );
    throw new ValidationError('Validation failed', errorMessages);
  }

  const { id } = value;

  // Fetch learning
  const learning = await getLearningById(id);

  logger.info(`Retrieved learning learningId=${id}`);

  return res.status(200).json({
    success: true,
    data: learning,
  });
});


/**
 * Update a learning (only by owner)
 * @route PATCH /api/v1/learnings/:id
 * @access Private (Owner only)
 */
const updateLearningController = asyncHandler(async (req, res) => {
  // Validate learning ID
  const paramValidation = learningIdParamSchema.validate(req.params, { abortEarly: false });
  if (paramValidation.error) {
    const errorMessages = paramValidation.error.details.map((detail) => detail.message);
    throw new ValidationError('Validation failed', errorMessages);
  }

  const { id } = paramValidation.value;

  // Validate request body
  const bodyValidation = updateLearningSchema.validate(req.body, { abortEarly: false });
  if (bodyValidation.error) {
    const errorMessages = bodyValidation.error.details.map((detail) => detail.message);
    logger.error(`Validation error occurred when updating learning: ${errorMessages.join(', ')}`);
    throw new ValidationError('Validation failed', errorMessages);
  }

  // Update learning
  const updatedLearning = await updateLearning(req.user, id, bodyValidation.value);

  logger.info(`Learning updated successfully by userId=${req.user.id}, learningId=${id}`);

  return res.status(200).json({
    success: true,
    message: 'Learning updated successfully',
    data: updatedLearning,
  });
});

/**
 * Delete a learning (only by owner)
 * @route DELETE /api/v1/learnings/:id
 * @access Private (Owner only)
 */
const deleteLearningController = asyncHandler(async (req, res) => {
  // Validate learning ID
  const { error, value } = learningIdParamSchema.validate(req.params, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError('Validation failed', errorMessages);
  }

  const { id } = value;

  // Delete learning
  await deleteLearning(req.user, id);

  logger.info(`Learning deleted successfully by userId=${req.user.id}, learningId=${id}`);

  return res.status(200).json({
    success: true,
    message: 'Learning deleted successfully',
  });
});

module.exports = {
  createLearning: createLearningController,
  getAllLearnings: getAllLearningsController,
  getLearningById: getLearningByIdController,
  getMyLearnings: getMyLearningsController,
  updateLearning: updateLearningController,
  deleteLearning: deleteLearningController,
};
