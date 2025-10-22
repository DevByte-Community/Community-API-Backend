// tests/user/userController.unit.test.js
// Mock the service before importing controller
const mockUploadProfilePicture = jest.fn();
jest.mock('../../services/userService', () => ({
  uploadProfilePicture: mockUploadProfilePicture,
}));


// Mock logger
jest.mock('../../utils/logger', () => {
  return jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));
});

// Mock asyncHandler to be transparent in tests
jest.mock('../../middleware/errorHandler', () => ({
  asyncHandler: (fn) => fn, // Just return the function unwrapped
}));

// Import dependencies after mocks
const { updateProfilePicture, updateProfile } = require('../../controllers/userController');
const { ValidationError } = require('../../utils/customErrors');

// Helper to create mock request object
const mockRequest = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  file: {
    buffer: Buffer.from('fake-image-data'),
    originalname: 'profile.jpg',
    mimetype: 'image/jpeg',
  },
  ...overrides,
});

// Helper to create mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('UserController - updateProfilePicture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // CRITICAL: SUCCESSFUL UPLOAD
  // ============================================================
  describe('Critical: Successful Upload', () => {
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

      // Service should be called with correct parameters
      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        req.user,
        req.file.buffer,
        'profile.jpg',
        'image/jpeg'
      );

      // Response should be 200
      expect(res.status).toHaveBeenCalledWith(200);

      // Response should have correct structure
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile picture updated successfully',
        user: mockUpdatedUser,
      });
    });
  });

  // ============================================================
  // CRITICAL: MISSING FILE VALIDATION
  // ============================================================
  describe('Critical: Missing File Validation', () => {
    it('should throw ValidationError when no file is uploaded', async () => {
      const req = mockRequest({ file: undefined });
      const res = mockResponse();

      await expect(updateProfilePicture(req, res)).rejects.toThrow(ValidationError);
      await expect(updateProfilePicture(req, res)).rejects.toThrow(
        'No file uploaded. Please provide a profile picture.'
      );

      // Service should not be called
      expect(mockUploadProfilePicture).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when req.file is null', async () => {
      const req = mockRequest({ file: null });
      const res = mockResponse();

      await expect(updateProfilePicture(req, res)).rejects.toThrow(ValidationError);
      expect(mockUploadProfilePicture).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // CRITICAL: REQUEST DATA EXTRACTION
  // ============================================================
  describe('Critical: Request Data Extraction', () => {
    it('should extract user from req.user', async () => {
      const req = mockRequest({
        user: { id: 'user-custom-id', email: 'custom@example.com' },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-custom-id',
        fullname: 'Custom User',
        email: 'custom@example.com',
        role: 'USER',
        profilePicture: 'test-bucket/picture.jpg',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-custom-id' }),
        expect.any(Buffer),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should extract file buffer from req.file.buffer', async () => {
      const customBuffer = Buffer.from('custom-image-data-12345');
      const req = mockRequest({
        file: {
          buffer: customBuffer,
          originalname: 'custom.jpg',
          mimetype: 'image/jpeg',
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.jpg',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        customBuffer,
        'custom.jpg',
        'image/jpeg'
      );
    });

    it('should pass originalname and mimetype to service', async () => {
      const req = mockRequest({
        file: {
          buffer: Buffer.from('data'),
          originalname: 'my-avatar.png',
          mimetype: 'image/png',
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.png',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        'my-avatar.png',
        'image/png'
      );
    });
  });

  // ============================================================
  // CRITICAL: ERROR SCENARIOS
  // ============================================================
  describe('Critical: Error Scenarios', () => {
    it('should handle missing req.user gracefully', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      // This should throw before reaching service
      await expect(updateProfilePicture(req, res)).rejects.toThrow();
    });

    it('should handle missing req.file.buffer', async () => {
      const req = mockRequest({
        file: {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          // Missing buffer
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.jpg',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      // Should pass undefined buffer to service (service will handle)
      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
        'test.jpg',
        'image/jpeg'
      );
    });
  });

  // ============================================================
  // CRITICAL: DIFFERENT FILE TYPES
  // ============================================================
  describe('Critical: Different File Types', () => {
    it('should handle JPEG files correctly', async () => {
      const req = mockRequest({
        file: {
          buffer: Buffer.from('jpeg-data'),
          originalname: 'photo.jpg',
          mimetype: 'image/jpeg',
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.jpg',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        'photo.jpg',
        'image/jpeg'
      );
    });

    it('should handle PNG files correctly', async () => {
      const req = mockRequest({
        file: {
          buffer: Buffer.from('png-data'),
          originalname: 'avatar.png',
          mimetype: 'image/png',
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.png',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        'avatar.png',
        'image/png'
      );
    });

    it('should handle image/jpg mimetype variant', async () => {
      const req = mockRequest({
        file: {
          buffer: Buffer.from('jpg-data'),
          originalname: 'pic.jpg',
          mimetype: 'image/jpg', // Alternative MIME type
        },
      });
      const res = mockResponse();

      mockUploadProfilePicture.mockResolvedValue({
        id: 'user-123',
        profilePicture: 'test-bucket/picture.jpg',
        updatedAt: new Date(),
      });

      await updateProfilePicture(req, res);

      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Buffer),
        'pic.jpg',
        'image/jpg'
      );
    });
  });

  // ============================================================
  // TEST SUITE: updateProfile (new)
  // ============================================================
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

      expect(mockValidate).toHaveBeenCalledWith(
        { mock: 'schema' },
        req.body
      );

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
      const req = mockRequest({
        body: { fullname: 'Jane Doe' },
      });
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

});


