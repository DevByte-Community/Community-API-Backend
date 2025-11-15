// services/roleService.js
const { User } = require('../models');
const createLogger = require('../utils/logger');

const logger = createLogger('ROLE_SERVICE');

class RoleService {
  /**
   * Assign a role to a user
   * @param {string} callerId - ID of the user making the request
   * @param {string} userId - ID of the user to update
   * @param {string} role - Role to assign
   */
  async assignRole(callerId, userId, role) {
    // Validate role
    const validRoles = ['USER', 'ADMIN', 'ROOT'];
    if (!validRoles.includes(role)) {
      const error = new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // Rule 1: ROOT cannot be assigned through API
    if (role === 'ROOT') {
      const error = new Error('ROOT role cannot be assigned. There can only be one ROOT user.');
      error.statusCode = 403;
      throw error;
    }

    // Get caller (the person making the request)
    const caller = await User.findByPk(callerId);
    if (!caller) {
      const error = new Error('Caller not found');
      error.statusCode = 404;
      throw error;
    }

    // Get target user
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      const error = new Error('Target user not found');
      error.statusCode = 404;
      throw error;
    }

    // Rule 2: Cannot downgrade own role
    if (callerId === userId) {
      const error = new Error('You cannot modify your own role');
      error.statusCode = 403;
      throw error;
    }

    // Rule 3: Check if caller has permission to assign this role
    if (!caller.canAssignRole(role)) {
      const error = new Error(
        `Insufficient permissions. Only ADMIN or ROOT can assign ${role} role.`
      );
      error.statusCode = 403;
      throw error;
    }

    // Rule 4: Cannot assign role higher than caller's role
    const hierarchy = { USER: 1, ADMIN: 2, ROOT: 3 };
    if (hierarchy[role] > hierarchy[caller.role]) {
      const error = new Error('Cannot assign a role higher than your own');
      error.statusCode = 403;
      throw error;
    }

    // Update the role
    targetUser.role = role;
    await targetUser.save();

    logger.info(
      `Role updated: User ${targetUser.email} (${userId}) assigned ${role} by ${caller.email} (${callerId})`
    );

    return {
      success: true,
      message: 'Role updated',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
    };
  }
}

module.exports = new RoleService();
