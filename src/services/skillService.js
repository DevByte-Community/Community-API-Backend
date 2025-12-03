// services/skillService.js
const createLogger = require('../utils/logger');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} = require('../utils/customErrors');
const { Skill, sequelize } = require('../models');
const {
  getCachedSkill,
  cacheSkill,
  getCachedSkillList,
  cacheSkillList,
  getCachedSkillCount,
  cacheSkillCount,
  invalidateAllSkillCaches,
  invalidateSkillCache,
  invalidateSkillNameCache,
  getCachedSkillNameLookup,
  cacheSkillNameLookup,
} = require('../utils/skillCache');

const logger = createLogger('SKILL_SERVICE');

/**
 * Get all skills with pagination (with caching)
 * @param {Object} paginationOptions - Pagination options { page, pageSize }
 * @returns {Object} Paginated skills result with metadata
 */
const getAllSkills = async (paginationOptions = {}) => {
  try {
    const { page = 1, pageSize = 10 } = paginationOptions;

    // Try to get from cache first
    const cachedResult = await getCachedSkillList(page, pageSize);
    if (cachedResult) {
      return cachedResult;
    }

    // Cache miss - fetch from database
    const offset = (page - 1) * pageSize;

    // Try to get count from cache first
    let totalCount = await getCachedSkillCount();
    if (totalCount === null) {
      totalCount = await Skill.count();
      // Cache the count for future use
      await cacheSkillCount(totalCount);
    }

    // Fetch skills from database
    const skills = await Skill.findAll({
      limit: parseInt(pageSize, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']], // Order by newest first
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const result = {
      success: true,
      data: skills,
      pagination: {
        currentPage: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };

    // Cache the result for future requests
    await cacheSkillList(page, pageSize, result);

    logger.info(`Retrieved ${skills.length} skills (page ${page} of ${totalPages})`);

    return result;
  } catch (error) {
    logger.error(`Error fetching skills: ${error.message}`);
    throw new InternalServerError('Failed to fetch skills');
  }
};

/**
 * Get a single skill by ID (with caching)
 * @param {string} skillId - UUID of the skill
 * @returns {Object} Skill object
 */
const getSkillById = async (skillId) => {
  try {
    // Try to get from cache first
    const cachedSkill = await getCachedSkill(skillId);
    if (cachedSkill) {
      return cachedSkill;
    }

    // Cache miss - fetch from database
    const skill = await Skill.findByPk(skillId);

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    // Cache the skill for future requests
    await cacheSkill(skillId, skill);

    logger.info(`Retrieved skill: ${skillId}`);
    return skill;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error fetching skill: ${error.message}`);
    throw new InternalServerError('Failed to fetch skill');
  }
};

/**
 * Create a new skill (with cache invalidation)
 * @param {Object} skillData - Skill data { name, description }
 * @param {string} createdBy - Id of the user creating the skill which is nullable
 * @returns {Object} Created skill object
 */
const createSkill = async (skillData, createdBy = null) => {
  try {
    const { name, description } = skillData;
    const normalizedName = name.trim();

    // Check cache first for name lookup
    const cachedSkillId = await getCachedSkillNameLookup(normalizedName);
    if (cachedSkillId) {
      throw new ConflictError('Skill with this name already exists');
    }

    // Check if skill with same name already exists in database
    const existingSkill = await Skill.findOne({
      where: { name: normalizedName },
    });

    if (existingSkill) {
      // Cache the name lookup for future duplicate checks
      await cacheSkillNameLookup(normalizedName, existingSkill.id);
      throw new ConflictError('Skill with this name already exists');
    }

    // Create the skill
    const skill = await Skill.create({
      name: normalizedName,
      description: description?.trim() || null,
      createdBy: createdBy,
    });

    // Cache the new skill
    await cacheSkill(skill.id, skill);

    // Cache the name lookup
    await cacheSkillNameLookup(normalizedName, skill.id);

    // Invalidate list caches and count cache (new skill added)
    await invalidateAllSkillCaches();

    logger.info(`Created skill: ${skill.id} - ${skill.name} by user: ${createdBy}`);
    return skill;
  } catch (error) {
    if (
      error instanceof ConflictError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }

    logger.error(`Error creating skill: ${error.message}`);
    throw new InternalServerError('Failed to create skill');
  }
};

/**
 * Update an existing skill (with cache invalidation)
 * @param {string} skillId - UUID of the skill
 * @param {Object} updates - Skill update data { name?, description? }
 * @returns {Object} Updated skill object
 */
const updateSkill = async (skillId, updates) => {
  try {
    const skill = await Skill.findByPk(skillId);

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }
    logger.info(`Updating skill: ${skillId} - ${JSON.stringify(skill)}`);

    const oldName = skill.name;
    const newName = updates.name ? updates.name.trim() : null;

    // Check if name is being updated and if it conflicts with existing skill
    if (newName && newName !== oldName) {
      // Check cache first
      const cachedSkillId = await getCachedSkillNameLookup(newName);
      if (cachedSkillId && cachedSkillId !== skillId) {
        throw new ConflictError('Skill with this name already exists');
      }

      // Check database
      const existingSkill = await Skill.findOne({
        where: { name: newName },
      });

      if (existingSkill) {
        // Cache the name lookup
        await cacheSkillNameLookup(newName, existingSkill.id);
        throw new ConflictError('Skill with this name already exists');
      }
    }

    // Update fields
    if (updates.name) skill.name = newName;
    if (updates.description !== undefined) {
      skill.description = updates.description?.trim() || null;
    }
    skill.updatedAt = new Date();

    await skill.save();

    // Invalidate old name cache if name changed
    if (newName && newName !== oldName) {
      await invalidateSkillNameCache(oldName);
      await cacheSkillNameLookup(newName, skillId);
    }

    // Invalidate skill cache and update it
    await invalidateSkillCache(skillId);
    await cacheSkill(skillId, skill);

    // Invalidate list caches (skill order/content may have changed)
    await invalidateAllSkillCaches();

    logger.info(`Updated skill: ${skillId} - ${skill.name}`);

    return skill;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof ConflictError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    logger.error(`Error updating skill: ${error.message}`);
    throw new InternalServerError('Failed to update skill');
  }
};

/**
 * Batch create multiple skills
 * @param {Array} skillsData - Array of skill data objects [{ name, description }, ...]
 * @param {string} createdBy - UUID of the user creating the skills
 * @returns {Object} Object with created skills, skipped duplicates, and errors
 */
const batchCreateSkills = async (skillsData, createdBy = null) => {
  const transaction = await sequelize.transaction();

  try {
    const created = [];
    const skipped = [];
    const errors = [];

    for (let i = 0; i < skillsData.length; i++) {
      const skillData = skillsData[i];
      try {
        const { name, description } = skillData;
        const normalizedName = name.trim();

        // Check if skill already exists
        const existingSkill = await Skill.findOne({
          where: { name: normalizedName },
          transaction,
        });

        if (existingSkill) {
          skipped.push({
            index: i,
            name: normalizedName,
            reason: 'Skill with this name already exists',
          });
          continue;
        }

        // Create the skill
        const skill = await Skill.create(
          {
            name: normalizedName,
            description: description?.trim() || null,
            createdBy: createdBy,
          },
          { transaction }
        );

        // Cache the new skill
        await cacheSkill(skill.id, skill);
        await cacheSkillNameLookup(normalizedName, skill.id);

        created.push(skill);
      } catch (error) {
        errors.push({
          index: i,
          name: skillData.name,
          error: error.message,
        });
      }
    }

    // If any skills were created, invalidate caches
    if (created.length > 0) {
      await invalidateAllSkillCaches();
    }

    await transaction.commit();

    logger.info(
      `Batch created ${created.length} skills, skipped ${skipped.length}, errors: ${errors.length} by user: ${createdBy}`
    );

    return {
      success: true,
      created,
      skipped,
      errors,
      summary: {
        total: skillsData.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
      },
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error in batch skill creation: ${error.message}`);
    throw new InternalServerError('Failed to batch create skills');
  }
};

/**
 * Delete a skill (with cache invalidation)
 * @param {string} skillId - UUID of the skill
 * @returns {boolean} True if deleted successfully
 */
const deleteSkill = async (skillId) => {
  try {
    const skill = await Skill.findByPk(skillId);

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    const skillName = skill.name;

    await skill.destroy();

    // Invalidate all caches related to this skill
    await invalidateSkillCache(skillId);
    await invalidateSkillNameCache(skillName);
    await invalidateAllSkillCaches(); // Invalidate lists and count

    logger.info(`Deleted skill: ${skillId} - ${skillName}`);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    logger.error(`Error deleting skill: ${error.message}`);
    throw new InternalServerError('Failed to delete skill');
  }
};

module.exports = {
  getAllSkills,
  getSkillById,
  createSkill,
  batchCreateSkills,
  updateSkill,
  deleteSkill,
};
