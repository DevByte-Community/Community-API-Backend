'use strict';
const { Skill } = require('../models');
const { UniqueConstraintError } = require('sequelize');
const createLogger = require('../utils/logger');

const logger = createLogger('MODULE:SKILL_SERVICE');

class SkillService {
  /**
   * Creates a new skill record in the database.
   * @param {object} data - Object containing validated skill data (name, description).
   */
  async create({ name, description }) {
    try {
      const skill = await Skill.create({
        name,
        description: description || '',
      });

      logger.info(`${name} skill sucessfully created.`);

      return {
        message: 'Skill created successfully',
        success: true,
        skill: {
          id: skill.id,
          name: skill.name,
          description: skill.description || null,
          created_at: skill.createdAt,
        },
      };
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        const uniqueError = new Error('This skill already exists.');
        uniqueError.statusCode = 409;
        throw uniqueError;
      }

      logger.error(`Failed to create skill ${name} - ${err.message}`);
      const serverError = new Error('Failed to create skill due to a server error.');
      serverError.statusCode = 500;
      throw serverError;
    }
  }

  async update({ id, name, description }) {
    try {
      const skill = await Skill.findByPk(id);

      if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
      }

      if (name) {
        skill.name = name;
      }

      if (description) {
        skill.description = description;
      }

      if (skill.changed()) {
        await skill.save();

        logger.info(`Skill updated for Id:${id}`);

        return {
          success: true,
          message: 'Skill updated successfully',
          skill: {
            id: id,
            name: skill.name,
            description: skill.description || null,
            updated_at: skill.updatedAt,
          },
        };
      } else {
        logger.info(`Skill update called for Id:${id}, but no new data provided.`);

        return {
          success: true,
          message: 'No changes detected; resource state retained.',
          skill: {
            id: id,
            name: skill.name,
            description: skill.description || null,
            updated_at: skill.updatedAt,
          },
        };
      }
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        const uniqueError = new Error('This skill already exists.');
        uniqueError.statusCode = 409;
        throw uniqueError;
      }

      if (err.statusCode) {
        throw err;
      }

      logger.error(`Failed to update skill - ${err.message}`);
      const serverError = new Error('Failed to update skill due to a server error.');
      serverError.statusCode = 500;
      throw serverError;
    }
  }

  /**
   * Retrieves all skill records with pagination.
   * @param {number} page - The current page number (1-based).
   * @param {number} limit - The maximum number of items per page.
   * @returns {Promise<object>} A promise that resolves to an object containing skills and pagination info.
   */
  async getAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit; // Calculate the OFFSET
      const totalCount = await Skill.count(); // Fetch the total count

      // Fetch the paginated records
      const skills = await Skill.findAll({
        attributes: ['id', 'name', 'description', 'createdAt'],
        limit: limit,
        offset: offset,
        order: [['createdAt', 'DESC']],
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      return {
        success: true,
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description || null,
          created_at: skill.createdAt,
        })),
        pagination: {
          totalItems: totalCount,
          totalPages: totalPages,
          currentPage: currentPage,
          itemsPerPage: limit,
        },
      };
    } catch (err) {
      logger.error(`Failed to retrieve paginated skills: ${err.message}`);
      const serverError = new Error('Failed to retrieve skills due to a server error.');
      serverError.statusCode = 500;
      throw serverError;
    }
  }

  async delete(id) {
    try {
      const skill = await Skill.findByPk(id);

      if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 400;
        throw error;
      }

      const deleteRows = await Skill.destroy({ where: { id: id } });
      if (deleteRows === 0) {
        const error = new Error('Skill not found or already deleted.');
        error.statusCode = 404;
        throw error;
      }

      logger.info(`Skill deleted for Id: ${id}`);

      return {
        success: true,
        message: 'Skill deleted successfully',
      };
    } catch (err) {
      if (err.statusCode) {
        throw err;
      }

      logger.error(`Failed to delete skill - ${err.message}`);
      const serverError = new Error('Failed to delete skill due to a server error.');
      serverError.statusCode = 500;
      throw serverError;
    }
  }
}

module.exports = new SkillService();
