// tests/user/userController.unit.test.js

// -------------------------------------------------------
// STEP 1: Mock service dependencies BEFORE controller import
// -------------------------------------------------------
const mockUploadProfilePicture = jest.fn();
const mockUpdateProfileData = jest.fn();

jest.mock('../../services/userService', () => ({
  uploadProfilePicture: mockUploadProfilePicture,
  updateProfileData: mockUpdateProfileData,
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

// -------------------------------------------------------
// STEP 5: Import controller after mocks
// -------------------------------------------------------
const {
  updateProfilePicture,
  updateProfile,
  getProfile,
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
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
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
          },
        },
      });
      const res = mockResponse();

      await getProfile(req, res);

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
});
