// tests/user/userController.unit.test.js

// -------------------------------------------------------
// STEP 1: Mock service dependencies BEFORE controller import
// -------------------------------------------------------
const mockUploadProfilePicture = jest.fn();
const mockUpdateProfileData = jest.fn();
const mockDeleteUserAccount = jest.fn();
const mockChangeUserPassword = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetUserSkills = jest.fn();
const mockAddSkillToUser = jest.fn();
const mockRemoveSkillFromUser = jest.fn();

const mockChangePasswordValidate = jest.fn();

jest.mock('../../services/userService', () => ({
  uploadProfilePicture: mockUploadProfilePicture,
  updateProfileData: mockUpdateProfileData,
  deleteUserAccount: mockDeleteUserAccount,
  changeUserPassword: mockChangeUserPassword,
  getAllUsers: mockGetAllUsers,
  getUserSkills: mockGetUserSkills,
  addSkillToUser: mockAddSkillToUser,
  removeSkillFromUser: mockRemoveSkillFromUser,
}));

// -------------------------------------------------------
// STEP 2: Mock logger
// -------------------------------------------------------
jest.mock('../../utils/logger', () => {
  return jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));
});

// -------------------------------------------------------
// STEP 3: Mock asyncHandler (transparent in tests)
// -------------------------------------------------------
jest.mock('../../middleware/errorHandler', () => ({
  asyncHandler: (fn) => fn,
}));

// -------------------------------------------------------
// STEP 4: Mock validator module
// -------------------------------------------------------
const mockValidate = jest.fn();
jest.mock('../../utils/index', () => ({
  validate: (...args) => mockValidate(...args),
}));

// utils/validator — we override changePasswordSchema and paginationQuerySchema
const mockPaginationQueryValidate = jest.fn();
jest.mock('../../utils/validator', () => {
  const actual = jest.requireActual('../../utils/validator');
  return {
    ...actual,
    changePasswordSchema: {
      validate: (...args) => mockChangePasswordValidate(...args),
    },
    paginationQuerySchema: {
      validate: (...args) => mockPaginationQueryValidate(...args),
    },
  };
});

// -------------------------------------------------------
// STEP 5: Import controller after mocks
// -------------------------------------------------------
const {
  updateProfilePicture,
  updateProfile,
  getProfile,
  deleteAccount,
  changePassword,
  getAllUsers,
  _addSkillToUser,
  _removeSkillFromUser,
  _getUserSkills,
} = require('../../controllers/userController');
const { ValidationError } = require('../../utils/customErrors');

// -------------------------------------------------------
// STEP 6: Helpers
// -------------------------------------------------------
const mockRequest = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  file: {
    buffer: Buffer.from('fake-image-data'),
    originalname: 'profile.jpg',
    mimetype: 'image/jpeg',
  },
  body: {},
  query: {},
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// -------------------------------------------------------
// TEST SUITE
// -------------------------------------------------------
describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================================================
  // updateProfilePicture TESTS (Existing - unchanged)
  // ======================================================
  describe('updateProfilePicture', () => {
    it('should return 200 with user data when upload succeeds', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockUpdatedUser = {
        id: 'user-123',
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        profilePicture: 'test-bucket/profile_picture_user-123_1234567890.jpg',
        updatedAt: new Date('2025-10-12T12:00:00.000Z'),
      };

      mockUploadProfilePicture.mockResolvedValue(mockUpdatedUser);

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        req.user,
        req.file.buffer,
        'profile.jpg',
        'image/jpeg'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile picture updated successfully',
        user: mockUpdatedUser,
      });
    });

    it('should throw ValidationError when no file is uploaded', async () => {
      const req = mockRequest({ file: undefined });
      const res = mockResponse();

      await expect(updateProfilePicture(req, res)).rejects.toThrow(ValidationError);
      expect(mockUploadProfilePicture).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // ✅ updateProfile TESTS (New + Fixed)
  // ======================================================
  describe('updateProfile', () => {
    it('should validate input and return 200 on success', async () => {
      const req = mockRequest({
        body: { fullname: 'John Doe', bio: 'Loves testing' },
      });
      const res = mockResponse();

      const validatedData = { fullname: 'John Doe', bio: 'Loves testing' };
      mockValidate.mockReturnValue({ _value: validatedData, errorResponse: null });

      const mockResult = {
        success: true,
        message: 'Profile updated successfully',
        user: { id: 'user-123', fullname: 'John Doe', bio: 'Loves testing' },
      };

      mockUpdateProfileData.mockResolvedValue(mockResult);

      await updateProfile(req, res);

      expect(mockValidate).toHaveBeenCalled();
      expect(mockUpdateProfileData).toHaveBeenCalledWith(req.user, validatedData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 if validation fails', async () => {
      const req = mockRequest({ body: { fullname: '' } });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: null,
        errorResponse: { success: false, message: 'Invalid input' },
      });

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid input' });
      expect(mockUpdateProfileData).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const req = mockRequest({ body: { fullname: 'Jane Doe' } });
      const res = mockResponse();

      const validatedData = { fullname: 'Jane Doe' };
      mockValidate.mockReturnValue({ _value: validatedData, errorResponse: null });

      const error = new Error('Database error');
      mockUpdateProfileData.mockRejectedValue(error);

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });

    it('should log and handle missing req.user gracefully', async () => {
      const req = mockRequest({ user: undefined, body: { fullname: 'No User' } });
      const res = mockResponse();

      mockValidate.mockReturnValue({ _value: { fullname: 'No User' }, errorResponse: null });
      mockUpdateProfileData.mockRejectedValue(new Error('User not found'));

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });
  });

  // ======================================================
  // getProfile TESTS (new)
  // ======================================================
  describe('getProfile', () => {
    it('returns 200 with user data + skills[]', async () => {
      // controller uses req.user.dataValues
      const req = mockRequest({
        user: {
          id: 'user-123',
          dataValues: {
            id: 'user-123',
            email: 'test@example.com',
            fullname: 'John',
            password: '123456',
          },
        },
      });
      const res = mockResponse();

      // Mock getUserSkills to return empty array
      mockGetUserSkills.mockResolvedValue([]);

      await getProfile(req, res);

      expect(mockGetUserSkills).toHaveBeenCalledWith(req.user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Get Profile successfully',
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          fullname: 'John',
          skills: [],
        }),
      });
    });

    it('returns 500 when an exception is raised (e.g., missing req.user)', async () => {
      // Make req.user undefined so logger.info(req.user.id) throws
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          // message will be a TypeError about reading 'id' of undefined; assert presence only
          message: expect.any(String),
        })
      );
    });
  });

  // ======================================================
  // deleteAccount TESTS
  // ======================================================
  describe('deleteAccount', () => {
    it('should delete account with provided non-empty reason and clear cookies', async () => {
      const req = mockRequest({
        body: {
          reason: '  privacy concern ', // will be trimmed by controller
        },
      });
      const res = mockResponse();

      mockDeleteUserAccount.mockResolvedValue();

      await deleteAccount(req, res);

      // deleteUserAccount called with trimmed reason
      expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-123', 'privacy concern');

      // cookies cleared
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));

      // response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Your account have been permanently deleted',
      });
    });

    it('should default reason to "unknown" when not provided', async () => {
      const req = mockRequest({
        body: {}, // no reason
      });
      const res = mockResponse();

      mockDeleteUserAccount.mockResolvedValue();

      await deleteAccount(req, res);

      expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-123', 'unknown');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Your account have been permanently deleted',
      });
    });

    it('should treat blank reason as "unknown"', async () => {
      const req = mockRequest({
        body: { reason: '   ' }, // only spaces
      });
      const res = mockResponse();

      mockDeleteUserAccount.mockResolvedValue();

      await deleteAccount(req, res);

      expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-123', 'unknown');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Your account have been permanently deleted',
      });
    });

    it('should handle missing body (req.body = undefined) and still default reason to "unknown"', async () => {
      const req = mockRequest({
        body: undefined, // controller does: const body = req.body || {}
      });
      const res = mockResponse();

      mockDeleteUserAccount.mockResolvedValue();

      await deleteAccount(req, res);

      expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-123', 'unknown');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Your account have been permanently deleted',
      });
    });

    it('should propagate error from deleteUserAccount and not send response', async () => {
      const req = mockRequest({
        body: { reason: 'privacy' },
      });
      const res = mockResponse();

      const error = new Error('delete failed');
      mockDeleteUserAccount.mockRejectedValue(error);

      await expect(deleteAccount(req, res)).rejects.toThrow('delete failed');

      // No cookies cleared and no response written if service fails
      expect(res.clearCookie).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // changePassword TESTS
  // ======================================================
  describe('changePassword', () => {
    it('should call changeUserPassword and return 200 on success', async () => {
      const req = mockRequest({
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        },
      });
      const res = mockResponse();

      // Joi validation success
      mockChangePasswordValidate.mockReturnValue({
        error: null,
        value: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        },
      });

      mockChangeUserPassword.mockResolvedValue(true);

      await changePassword(req, res);

      expect(mockChangePasswordValidate).toHaveBeenCalledWith(req.body);
      expect(mockChangeUserPassword).toHaveBeenCalledWith(
        req.user,
        'OldPassword123!',
        'NewPassword456!'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully',
      });
    });

    it('should throw ValidationError when Joi validation fails', async () => {
      const req = mockRequest({
        body: {
          currentPassword: '',
          newPassword: 'short',
          confirmPassword: 'mismatch',
        },
      });
      const res = mockResponse();

      mockChangePasswordValidate.mockReturnValue({
        error: {
          details: [{ message: 'New password must be at least 8 characters long' }],
        },
        value: null,
      });

      await expect(changePassword(req, res)).rejects.toThrow(ValidationError);

      expect(mockChangePasswordValidate).toHaveBeenCalledWith(req.body);
      expect(mockChangeUserPassword).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should propagate service ValidationError (e.g. wrong current password)', async () => {
      const req = mockRequest({
        body: {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        },
      });
      const res = mockResponse();

      // Validation OK
      mockChangePasswordValidate.mockReturnValue({
        error: null,
        value: {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        },
      });

      const serviceError = new ValidationError('Current password is incorrect');
      mockChangeUserPassword.mockRejectedValue(serviceError);

      await expect(changePassword(req, res)).rejects.toThrow(ValidationError);

      expect(mockChangeUserPassword).toHaveBeenCalledWith(
        req.user,
        'WrongPassword123!',
        'NewPassword456!'
      );
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle missing body (req.body = undefined) via schema', async () => {
      const req = mockRequest({ body: undefined });
      const res = mockResponse();

      mockChangePasswordValidate.mockReturnValue({
        error: {
          details: [{ message: 'Current password is required' }],
        },
        value: null,
      });

      await expect(changePassword(req, res)).rejects.toThrow(ValidationError);

      expect(mockChangePasswordValidate).toHaveBeenCalledWith({});
      expect(mockChangeUserPassword).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // getAllUsers TESTS
  // ======================================================
  describe('getAllUsers', () => {
    const mockServiceResult = {
      success: true,
      data: [
        {
          id: 'user-1',
          fullname: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
        },
        {
          id: 'user-2',
          fullname: 'Jane Smith',
          email: 'jane@example.com',
          role: 'USER',
        },
      ],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };

    it('should return 200 with paginated users when validation passes', async () => {
      const req = mockRequest({
        query: { page: '1', pageSize: '10' },
      });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: null,
        value: { page: 1, pageSize: 10 },
      });
      mockGetAllUsers.mockResolvedValue(mockServiceResult);

      await getAllUsers(req, res);

      expect(mockPaginationQueryValidate).toHaveBeenCalledWith(req.query);
      expect(mockGetAllUsers).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Users retrieved successfully',
        ...mockServiceResult,
      });
    });

    it('should use default pagination values when query params are missing', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: null,
        value: { page: 1, pageSize: 10 },
      });
      mockGetAllUsers.mockResolvedValue(mockServiceResult);

      await getAllUsers(req, res);

      expect(mockGetAllUsers).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw ValidationError when query validation fails', async () => {
      const req = mockRequest({
        query: { page: '0', pageSize: '10' },
      });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: {
          details: [{ message: 'Page must be at least 1' }],
        },
        value: null,
      });

      await expect(getAllUsers(req, res)).rejects.toThrow(ValidationError);

      expect(mockPaginationQueryValidate).toHaveBeenCalledWith(req.query);
      expect(mockGetAllUsers).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
