// tests/unit/services/roleService.test.js
const createLogger = require('../../../src/utils/logger');
const { User } = require('../../../src/models');
const roleService = require('../../../src/services/roleService');

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

describe('RoleService', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    createLogger.mockReturnValue(mockLogger);
  });

  describe('assignRole', () => {
    const hierarchy = { USER: 1, ADMIN: 2, ROOT: 3 };

    it('should assign role successfully when all rules pass', async () => {
      // Arrange
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ADMIN';

      const caller = {
        id: callerId,
        email: 'admin@test.com',
        role: 'ROOT',
        canAssignRole: jest.fn().mockReturnValue(true),
      };

      const targetUser = {
        id: userId,
        email: 'user@test.com',
        role: 'USER',
        save: jest.fn().mockResolvedValue(),
      };

      // 1st call: caller, 2nd call: target user
      User.findByPk.mockResolvedValueOnce(caller).mockResolvedValueOnce(targetUser);

      // Act
      const result = await roleService.assignRole(callerId, userId, role);

      // Assert
      expect(User.findByPk).toHaveBeenNthCalledWith(1, callerId);
      expect(User.findByPk).toHaveBeenNthCalledWith(2, userId);

      expect(caller.canAssignRole).toHaveBeenCalledWith(role);
      expect(targetUser.role).toBe(role);
      expect(targetUser.save).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        message: 'Role updated',
        user: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
        },
      });
    });

    it('should throw 400 for invalid role', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const invalidRole = 'SUPERADMIN';

      await expect(roleService.assignRole(callerId, userId, invalidRole)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Invalid role. Must be one of:'),
      });

      expect(User.findByPk).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should throw 403 when trying to assign ROOT role', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ROOT';

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 403,
        message: 'ROOT role cannot be assigned. There can only be one ROOT user.',
      });

      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('should throw 404 if caller is not found', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ADMIN';

      User.findByPk.mockResolvedValueOnce(null); // caller

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Caller not found',
      });

      expect(User.findByPk).toHaveBeenCalledTimes(1); // only caller lookup
    });

    it('should throw 404 if target user is not found', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ADMIN';

      const caller = {
        id: callerId,
        email: 'admin@test.com',
        role: 'ROOT',
        canAssignRole: jest.fn().mockReturnValue(true),
      };

      User.findByPk
        .mockResolvedValueOnce(caller) // caller
        .mockResolvedValueOnce(null); // target

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Target user not found',
      });

      expect(User.findByPk).toHaveBeenCalledTimes(2);
    });

    it('should throw 403 if caller tries to modify own role', async () => {
      const callerId = 'user-123';
      const userId = 'user-123';
      const role = 'ADMIN';

      const caller = {
        id: callerId,
        email: 'self@test.com',
        role: 'ADMIN',
        canAssignRole: jest.fn().mockReturnValue(true),
      };

      const targetUser = {
        id: userId,
        email: 'self@test.com',
        role: 'ADMIN',
        save: jest.fn(),
      };

      User.findByPk.mockResolvedValueOnce(caller).mockResolvedValueOnce(targetUser);

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 403,
        message: 'You cannot modify your own role',
      });

      expect(targetUser.save).not.toHaveBeenCalled();
    });

    it('should throw 403 if caller cannot assign that role (canAssignRole = false)', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ADMIN';

      const caller = {
        id: callerId,
        email: 'user@test.com',
        role: 'USER',
        canAssignRole: jest.fn().mockReturnValue(false),
      };

      const targetUser = {
        id: userId,
        email: 'target@test.com',
        role: 'USER',
        save: jest.fn(),
      };

      User.findByPk.mockResolvedValueOnce(caller).mockResolvedValueOnce(targetUser);

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Insufficient permissions'),
      });

      expect(caller.canAssignRole).toHaveBeenCalledWith(role);
      expect(targetUser.save).not.toHaveBeenCalled();
    });

    it('should throw 403 if trying to assign a role higher than caller role (hierarchy rule)', async () => {
      const callerId = 'caller-123';
      const userId = 'user-456';
      const role = 'ADMIN'; // higher than USER

      const caller = {
        id: callerId,
        email: 'user@test.com',
        role: 'USER', // hierarchy.USER = 1
        canAssignRole: jest.fn().mockReturnValue(true), // artificially true to reach hierarchy check
      };

      const targetUser = {
        id: userId,
        email: 'target@test.com',
        role: 'USER',
        save: jest.fn(),
      };

      User.findByPk.mockResolvedValueOnce(caller).mockResolvedValueOnce(targetUser);

      await expect(roleService.assignRole(callerId, userId, role)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Cannot assign a role higher than your own',
      });

      expect(caller.canAssignRole).toHaveBeenCalledWith(role);
      expect(targetUser.save).not.toHaveBeenCalled();

      // sanity check: our hierarchy logic matches the service code
      expect(hierarchy[role]).toBeGreaterThan(hierarchy[caller.role]);
    });
  });
});
