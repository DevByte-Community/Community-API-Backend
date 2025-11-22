// tests/unit/controllers/roleController.test.js
const roleController = require('../../../src/controllers/roleController');
const roleService = require('../../../src/services/roleService');
const Validator = require('../../../src/utils/index');
const createLogger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/services/roleService');
jest.mock('../../../src/utils/index');
jest.mock('../../../src/utils/logger');

describe('RoleController', () => {
  let req, res, mockLogger;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    createLogger.mockReturnValue(mockLogger);

    // Mock request object
    req = {
      body: {
        userId: 'user-123',
        role: 'ADMIN',
      },
      user: {
        id: 'caller-456',
        email: 'admin@test.com',
        role: 'ROOT',
      },
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('assignRole', () => {
    describe('Success Cases', () => {
      it('should assign role successfully with valid data', async () => {
        // Arrange
        const validatedValue = {
          userId: 'user-123',
          role: 'ADMIN',
        };

        const serviceResponse = {
          success: true,
          message: 'Role updated',
          user: {
            id: 'user-123',
            email: 'user@test.com',
            role: 'ADMIN',
          },
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        roleService.assignRole.mockResolvedValue(serviceResponse);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
        expect(roleService.assignRole).toHaveBeenCalledWith('caller-456', 'user-123', 'ADMIN');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(serviceResponse);
      });

      it('should handle USER role assignment', async () => {
        // Arrange
        req.body.role = 'USER';
        const validatedValue = {
          userId: 'user-123',
          role: 'USER',
        };

        const serviceResponse = {
          success: true,
          message: 'Role updated',
          user: {
            id: 'user-123',
            email: 'user@test.com',
            role: 'USER',
          },
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        roleService.assignRole.mockResolvedValue(serviceResponse);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(roleService.assignRole).toHaveBeenCalledWith('caller-456', 'user-123', 'USER');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(serviceResponse);
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 when validation fails', async () => {
        // Arrange
        const errorResponse = {
          success: false,
          message: 'Validation failed',
          errors: ['User ID is required'],
        };

        Validator.validate.mockReturnValue({
          _value: null,
          errorResponse: errorResponse,
        });

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
        expect(roleService.assignRole).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(errorResponse);
      });

      it('should return 400 for missing userId', async () => {
        // Arrange
        req.body.userId = undefined;
        const errorResponse = {
          success: false,
          message: 'Validation failed',
          errors: ['User ID is required'],
        };

        Validator.validate.mockReturnValue({
          _value: null,
          errorResponse: errorResponse,
        });

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(errorResponse);
      });

      it('should return 400 for invalid role', async () => {
        // Arrange
        req.body.role = 'INVALID_ROLE';
        const errorResponse = {
          success: false,
          message: 'Validation failed',
          errors: ['Role must be one of: USER, ADMIN, ROOT'],
        };

        Validator.validate.mockReturnValue({
          _value: null,
          errorResponse: errorResponse,
        });

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(errorResponse);
      });
    });

    describe('Service Errors', () => {
      it('should return 404 when user not found', async () => {
        // Arrange
        const validatedValue = {
          userId: 'non-existent-user',
          role: 'ADMIN',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error('Target user not found');
        serviceError.statusCode = 404;
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Target user not found',
        });
      });

      it('should return 403 when trying to assign ROOT role', async () => {
        // Arrange
        req.body.role = 'ROOT';
        const validatedValue = {
          userId: 'user-123',
          role: 'ROOT',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error(
          'ROOT role cannot be assigned. There can only be one ROOT user.'
        );
        serviceError.statusCode = 403;
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'ROOT role cannot be assigned. There can only be one ROOT user.',
        });
      });

      it('should return 403 when trying to modify own role', async () => {
        // Arrange
        const validatedValue = {
          userId: 'caller-456', // Same as caller
          role: 'USER',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error('You cannot modify your own role');
        serviceError.statusCode = 403;
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You cannot modify your own role',
        });
      });

      it('should return 403 when caller has insufficient permissions', async () => {
        // Arrange
        req.user.role = 'USER'; // Regular user trying to assign role
        const validatedValue = {
          userId: 'user-123',
          role: 'ADMIN',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error(
          'Insufficient permissions. Only ADMIN or ROOT can assign ADMIN role.'
        );
        serviceError.statusCode = 403;
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions. Only ADMIN or ROOT can assign ADMIN role.',
        });
      });

      it('should return 403 when trying to assign role higher than caller', async () => {
        // Arrange
        req.user.role = 'ADMIN'; // ADMIN trying to assign ROOT
        req.body.role = 'ROOT';
        const validatedValue = {
          userId: 'user-123',
          role: 'ROOT',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error('Cannot assign a role higher than your own');
        serviceError.statusCode = 403;
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Cannot assign a role higher than your own',
        });
      });

      it('should return 500 for unexpected errors without statusCode', async () => {
        // Arrange
        const validatedValue = {
          userId: 'user-123',
          role: 'ADMIN',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        const serviceError = new Error('Database connection failed');
        // No statusCode set
        roleService.assignRole.mockRejectedValue(serviceError);

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Database connection failed',
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty request body', async () => {
        // Arrange
        req.body = {};
        const errorResponse = {
          success: false,
          message: 'Validation failed',
          errors: ['User ID is required', 'Role is required'],
        };

        Validator.validate.mockReturnValue({
          _value: null,
          errorResponse: errorResponse,
        });

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(errorResponse);
      });

      it('should extract caller ID from req.user', async () => {
        // Arrange
        const validatedValue = {
          userId: 'user-123',
          role: 'ADMIN',
        };

        Validator.validate.mockReturnValue({
          _value: validatedValue,
          errorResponse: null,
        });

        roleService.assignRole.mockResolvedValue({
          success: true,
          message: 'Role updated',
          user: { id: 'user-123', email: 'user@test.com', role: 'ADMIN' },
        });

        // Act
        await roleController.assignRole(req, res);

        // Assert
        expect(roleService.assignRole).toHaveBeenCalledWith(
          'caller-456', // Extracted from req.user.id
          'user-123',
          'ADMIN'
        );
      });
    });
  });
});
