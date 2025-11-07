const skillService = require('../services/skillService');
const createLogger = require('../utils/logger');
const Validator = require('../utils/index');
const {
  createSkillSchema,
  updateSkillSchema,
  validateSkillId,
} = require('../utils/validators/skillValidator');

const logger = createLogger('SKILL_CONTROLLER');

class SkillController {
  // POST /api/v1/admin/skills
  async create(req, res) {
    try {
      const { _value, errorResponse } = Validator.validate(createSkillSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);
      logger.info(_value);

      const result = await skillService.create(_value);
      return res.status(201).json(result);
    } catch (err) {
      logger.error(`Failed to create skill - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  // PUT /api/v1/admin/skills/:id
  async update(req, res) {
    try {
      // Validate URL Parameters (ID)
      const { _value: paramValue, errorResponse: paramError } = Validator.validate(
        validateSkillId,
        req.params
      );
      if (paramError) return res.status(400).json(paramError);

      // Validate Request Body (name, description)
      const { _value, errorResponse } = Validator.validate(updateSkillSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      const payload = {
        id: paramValue.id,
        ..._value,
      };

      const result = await skillService.update(payload);
      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Failed to update skill - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  // GET /api/v1/admin/skills
  async getSkills(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Ensure limit and page are positive
      if (page < 1 || limit < 1) {
        return res
          .status(400)
          .json({ success: false, message: 'Page and limit must be positive numbers.' });
      }

      const result = await skillService.getSkills(page, limit);
      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Failed to get all skills - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  // DELETE /api/v1/admin/skills/:id
  async delete(req, res) {
    try {
      // Validate URL Parameters (ID)
      const { _value: paramValue, errorResponse: paramError } = Validator.validate(
        validateSkillId,
        req.params
      );
      if (paramError) return res.status(400).json(paramError);

      const result = await skillService.delete(paramValue.id);
      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Failed to delete skill - ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new SkillController();
