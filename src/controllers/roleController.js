// controllers/roleController.js
const roleService = require('../services/roleService');
const Validator = require('../utils/index');
const { assignRoleSchema } = require('../utils/validator');
const createLogger = require('../utils/logger');

const logger = createLogger('ROLE_CONTROLLER');

class RoleController {
  // POST /api/v1/roles/assign
  async assignRole(req, res) {
    try {
      // Validate request body
      const { _value, errorResponse } = Validator.validate(assignRoleSchema, req.body);
      if (errorResponse) return res.status(400).json(errorResponse);

      // Get caller ID from authenticated user
      const callerId = req.user.id;

      // Assign the role
      const result = await roleService.assignRole(callerId, _value.userId, _value.role);

      logger.info(`Role assignment success: ${_value.userId} -> ${_value.role}`);
      return res.status(200).json(result);
    } catch (err) {
      logger.error(`Role assignment failed: ${err.message}`);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = new RoleController();
