const createLogger = require('../utils/logger');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} = require('../utils/customErrors');
const { Learning, Tech, User, sequelize } = require('../models');

const { Op } = require('sequelize');

const logger = createLogger('LEARNING_SERVICE');

/**
 * Create a new learning module
 * @param {Object} user - Authenticated user object
 * @param {Object} learningData - Learning data (name, description, contentUrl, techs, duration, level)
 * @returns {Object} Created learning with techs
 */
const createLearning = async (user, learningData) => {
  try {
    const { name, description, contentUrl, techs, duration, level } = learningData;

    // Validate that all techs exist
    const existingTechs = await Tech.findAll({
      where: { id: { [Op.in]: techs } },
    });

    if (existingTechs.length !== techs.length) {
      const foundIds = existingTechs.map((t) => t.id);
      const missingIds = techs.filter((id) => !foundIds.includes(id));
      throw new ValidationError(
        `The following tech IDs do not exist: ${missingIds.join(', ')}`
      );
    }

    // Create learning
    let learning;

    await sequelize.transaction(async (t) => {
      learning = await Learning.create(
        {
          name,
          description,
          userId: user.id,
          contentUrl: contentUrl || null,
          duration,
          level,
        },
        { transaction: t }
      );

      if (techs?.length) {
        await learning.addTechs(techs, { transaction: t });
      }
    });

    // Fetch the complete learning with techs
    const completeLearning = await Learning.findByPk(learning.id, {
      include: [
        {
          model: Tech,
          as: 'techs',
          attributes: ['id', 'name', 'icon', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    logger.info(`Learning created successfully by userId=${user.id}, learningId=${learning.id}`);

    return completeLearning;
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof ForbiddenError
    ) {
      throw error;
    }

    logger.error(`Error creating learning: ${error.message}`);
    throw new InternalServerError(`Failed to create learning: ${error.message}`);
  }
};

/**
 * Get all learnings with optional filters
 * @param {Object} filters - Filter options { level, userId, page, pageSize }
 * @returns {Object} Paginated learnings
 */
const getAllLearnings = async (filters = {}) => {
  try {
    const { level, userId, page = 1, pageSize = 10 } = filters;

    // Build where clause
    const whereClause = {};
    if (level) whereClause.level = level;
    if (userId) whereClause.userId = userId;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Get total count and learnings in parallel
    const [totalCount, learnings] = await Promise.all([
      Learning.count({ where: whereClause }),
      Learning.findAll({
        where: whereClause,
        limit: parseInt(pageSize, 10),
        offset: parseInt(offset, 10),
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Tech,
            as: 'techs',
            attributes: ['id', 'name', 'icon', 'description'],
            through: { attributes: [] },
          },
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'fullname', 'email', 'profilePicture'],
          },
        ],
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    logger.info(
      `Retrieved ${learnings.length} learnings (page ${page} of ${totalPages}) with filters: ${JSON.stringify(filters)}`
    );

    return {
      success: true,
      data: learnings,
      pagination: {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalItems: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  } catch (error) {
    logger.error(`Error fetching learnings: ${error.message}`);
    throw new InternalServerError('Failed to fetch learnings');
  }
};

/**
 * Get a single learning by ID
 * @param {string} learningId - Learning UUID
 * @returns {Object} Learning with techs
 */
const getLearningById = async (learningId) => {
  try {
    const learning = await Learning.findByPk(learningId, {
      include: [
        {
          model: Tech,
          as: 'techs',
          attributes: ['id', 'name', 'icon', 'description'],
          through: { attributes: [] },
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'fullname', 'email', 'profilePicture'],
        },
      ],
    });

    if (!learning) {
      throw new NotFoundError('Learning not found');
    }

    logger.info(`Retrieved learning learningId=${learningId}`);
    return learning;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error fetching learning by ID: ${error.message}`);
    throw new InternalServerError('Failed to fetch learning');
  }
};

const getMyLearnings = async (userId) => {
  return await Learning.findAll({
    where: { userId },
    include: [
      {
        model: Tech,
        as: 'techs',
        attributes: ['id', 'name', 'icon', 'description'],
        through: { attributes: [] },
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Update a learning (only by owner)
 * @param {Object} user - Authenticated user
 * @param {string} learningId - Learning UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated learning
 */
const updateLearning = async (user, learningId, updates) => {
  try {
    const learning = await Learning.findByPk(learningId);

    if (!learning) {
      throw new NotFoundError('Learning not found');
    }

    // Ownership check - allow owner OR admin OR root
    const isOwner = learning.userId === user.id;
    const isAdmin = user.hasRole && user.hasRole('ADMIN');
    const isRoot = user.hasRole && user.hasRole('ROOT');

    if (!isOwner && !isAdmin && !isRoot) {
      throw new ForbiddenError('You do not have permission to update this learning');
    }

    // If techs are being updated, validate them
    if (updates.techs) {
      const existingTechs = await Tech.findAll({
        where: { id: { [Op.in]: updates.techs } },
      });

      if (existingTechs.length !== updates.techs.length) {
        const foundIds = existingTechs.map((t) => t.id);
        const missingIds = updates.techs.filter((id) => !foundIds.includes(id));
        throw new ValidationError(
          `The following tech IDs do not exist: ${missingIds.join(', ')}`
        );
      }

      // Update techs association
      await learning.setTechs(updates.techs);
    }

    // Update other fields
    const { techs, ...otherUpdates } = updates;
    if (Object.keys(otherUpdates).length > 0) {
      await learning.update({
        ...otherUpdates,
        updatedAt: new Date(),
      });
    }

    // Fetch updated learning with techs
    const updatedLearning = await Learning.findByPk(learningId, {
      include: [
        {
          model: Tech,
          as: 'techs',
          attributes: ['id', 'name', 'icon', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    logger.info(`Learning updated successfully by userId=${user.id}, learningId=${learningId}`);

    return updatedLearning;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof ForbiddenError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    logger.error(`Error updating learning: ${error.message}`);
    throw new InternalServerError('Failed to update learning');
  }
};

/**
 * Delete a learning (only by owner)
 * @param {Object} user - Authenticated user
 * @param {string} learningId - Learning UUID
 * @returns {boolean} True if deleted
 */
const deleteLearning = async (user, learningId) => {
  try {
    const learning = await Learning.findByPk(learningId);

    if (!learning) {
      throw new NotFoundError('Learning not found');
    }

    // Ownership check - allow owner OR admin OR root
    const isOwner = learning.userId === user.id;
    const isAdmin = user.hasRole && user.hasRole('ADMIN');
    const isRoot = user.hasRole && user.hasRole('ROOT');

    if (!isOwner && !isAdmin && !isRoot) {
      throw new ForbiddenError('You do not have permission to delete this learning');
    }

    // Delete learning
    await learning.destroy();

    logger.info(`Learning deleted successfully by userId=${user.id}, learningId=${learningId}`);

    return true;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error;
    }

    logger.error(`Error deleting learning: ${error.message}`);
    throw new InternalServerError('Failed to delete learning');
  }
};

module.exports = {
  createLearning,
  getAllLearnings,
  getLearningById,
  getMyLearnings,
  updateLearning,
  deleteLearning,
};
