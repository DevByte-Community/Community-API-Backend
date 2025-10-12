// tests/user/userService.unit.test.js
const { uploadProfilePicture } = require('../../services/userService');
const { minioClient } = require('../../utils/minioClient');
const { ValidationError, NotFoundError, InternalServerError } = require('../../utils/customErrors');

// Mock dependencies
jest.mock('../../utils/minioClient', () => ({
  minioClient: {
    putObject: jest.fn(),
    removeObject: jest.fn(),
  },
  bucketName: 'test-bucket',
}));

jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => {
  return jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));
});

describe('UserService - uploadProfilePicture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // SUCCESSFUL UPLOADS
  // ============================================================
  describe('Successful Uploads', () => {
    it('should successfully upload a JPEG profile picture', async () => {
      const mockUser = {
        id: 'user-123-abc',
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('fake-jpeg-data');
      const originalFileName = 'profile.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      // Update mock to reflect the change
      mockUser.update.mockImplementation(async (data) => {
        mockUser.profilePicture = data.profilePicture;
        mockUser.updatedAt = data.updatedAt;
        return true;
      });

      const result = await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      // Verify MinIO upload was called
      expect(minioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('profile_picture_user-123-abc_'),
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'image/jpeg' }
      );

      // Verify user update was called
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          profilePicture: expect.stringContaining('test-bucket/profile_picture_'),
          updatedAt: expect.any(Date),
        })
      );

      // Verify returned user object
      expect(result).toHaveProperty('id', 'user-123-abc');
      expect(result).toHaveProperty('fullname', 'John Doe');
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).toHaveProperty('role', 'USER');
      expect(result).toHaveProperty('profilePicture');
      expect(result.profilePicture).toContain('profile_picture_');
      expect(result.profilePicture).toContain('.jpg');
    });

    it('should successfully upload a PNG profile picture', async () => {
      const mockUser = {
        id: 'user-456-def',
        fullname: 'Jane Doe',
        email: 'jane@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockImplementation(async (data) => {
          mockUser.profilePicture = data.profilePicture;
          return true;
        }),
      };

      const fileBuffer = Buffer.from('fake-png-data');
      const originalFileName = 'avatar.png';
      const mimeType = 'image/png';

      minioClient.putObject.mockResolvedValue(true);

      const result = await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('.png'),
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'image/png' }
      );

      expect(result.profilePicture).toContain('.png');
    });
  });

  // ============================================================
  // OLD PICTURE DELETION
  // ============================================================
  describe('Old Picture Deletion', () => {
    it('should delete existing profile picture before uploading new one', async () => {
      const mockUser = {
        id: 'user-789-ghi',
        fullname: 'Bob Smith',
        email: 'bob@example.com',
        role: 'USER',
        profilePicture: 'test-bucket/old_profile_picture_12345.jpg',
        updatedAt: new Date(),
        update: jest.fn().mockImplementation(async (data) => {
          mockUser.profilePicture = data.profilePicture;
          return true;
        }),
      };

      const fileBuffer = Buffer.from('new-image-data');
      const originalFileName = 'new-profile.jpg';
      const mimeType = 'image/jpeg';

      minioClient.removeObject.mockResolvedValue(true);
      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      // Verify old picture deletion was attempted
      expect(minioClient.removeObject).toHaveBeenCalledWith(
        'test-bucket',
        'old_profile_picture_12345.jpg'
      );

      // Verify new picture was uploaded
      expect(minioClient.putObject).toHaveBeenCalled();
    });

    it('should continue upload even if old picture deletion fails', async () => {
      const mockUser = {
        id: 'user-999',
        fullname: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'USER',
        profilePicture: 'test-bucket/old_picture.jpg',
        updatedAt: new Date(),
        update: jest.fn().mockImplementation(async (data) => {
          mockUser.profilePicture = data.profilePicture;
          return true;
        }),
      };

      const fileBuffer = Buffer.from('new-image-data');
      const originalFileName = 'profile.jpg';
      const mimeType = 'image/jpeg';

      // Deletion fails but shouldn't stop the upload
      minioClient.removeObject.mockRejectedValue(new Error('File not found in MinIO'));
      minioClient.putObject.mockResolvedValue(true);

      const result = await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      // Upload should still succeed
      expect(minioClient.putObject).toHaveBeenCalled();
      expect(mockUser.update).toHaveBeenCalled();
      expect(result).toHaveProperty('profilePicture');
    });

    it('should not attempt deletion if user has no existing profile picture', async () => {
      const mockUser = {
        id: 'user-new',
        fullname: 'New User',
        email: 'new@example.com',
        role: 'USER',
        profilePicture: null, // No existing picture
        updatedAt: new Date(),
        update: jest.fn().mockImplementation(async (data) => {
          mockUser.profilePicture = data.profilePicture;
          return true;
        }),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'first-profile.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      // Should NOT attempt to remove old picture
      expect(minioClient.removeObject).not.toHaveBeenCalled();

      // Should still upload new picture
      expect(minioClient.putObject).toHaveBeenCalled();
    });
  });

  // ============================================================
  // DATABASE UPDATES
  // ============================================================
  describe('Database Updates', () => {
    it('should update user profilePicture and updatedAt in database', async () => {
      const mockUser = {
        id: 'user-db-update',
        fullname: 'DB Test User',
        email: 'dbtest@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date('2025-01-01'),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'profile.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          profilePicture: expect.any(String),
          updatedAt: expect.any(Date),
        })
      );

      const updateCall = mockUser.update.mock.calls[0][0];
      expect(updateCall.profilePicture).toContain('test-bucket/profile_picture_');
      expect(updateCall.updatedAt).toBeInstanceOf(Date);
    });

    it('should update profilePicture URL with correct bucket and filename', async () => {
      const mockUser = {
        id: 'user-url-test',
        fullname: 'URL Test',
        email: 'url@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'avatar.png';
      const mimeType = 'image/png';

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      const updateCall = mockUser.update.mock.calls[0][0];

      // URL should be: bucket/filename
      expect(updateCall.profilePicture).toMatch(/^test-bucket\/profile_picture_.*\.png$/);
    });
  });

  // ============================================================
  // MINIO INTEGRATION
  // ============================================================
  describe('MinIO Integration', () => {
    it('should upload to MinIO with correct parameters', async () => {
      const mockUser = {
        id: 'user-minio-test',
        fullname: 'MinIO Test',
        email: 'minio@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-bytes');
      const originalFileName = 'photo.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        'test-bucket', // bucket name
        expect.stringContaining('profile_picture_'), // object name
        fileBuffer, // buffer
        fileBuffer.length, // size
        { 'Content-Type': 'image/jpeg' } // metadata
      );
    });

    it('should use correct MIME type from parameter', async () => {
      const mockUser = {
        id: 'user-mime',
        fullname: 'MIME Test',
        email: 'mime@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('png-bytes');
      const originalFileName = 'image.png';
      const mimeType = 'image/png';

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType);

      const putObjectCall = minioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];

      expect(metadata['Content-Type']).toBe('image/png');
    });

    it('should throw InternalServerError if MinIO upload fails', async () => {
      const mockUser = {
        id: 'user-fail',
        fullname: 'Fail Test',
        email: 'fail@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'photo.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockRejectedValue(new Error('MinIO connection timeout'));

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow(InternalServerError);

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow('Failed to upload profile picture');
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  describe('Error Handling', () => {
    it('should throw InternalServerError when database update fails', async () => {
      const mockUser = {
        id: 'user-db-fail',
        fullname: 'DB Fail Test',
        email: 'dbfail@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'photo.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow(InternalServerError);
    });

    it('should re-throw ValidationError without wrapping', async () => {
      const mockUser = {
        id: 'user-validation',
        fullname: 'Validation Test',
        email: 'validation@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockRejectedValue(new ValidationError('Invalid data')),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'photo.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow(ValidationError);

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow('Invalid data');
    });

    it('should re-throw NotFoundError without wrapping', async () => {
      const mockUser = {
        id: 'user-notfound',
        fullname: 'NotFound Test',
        email: 'notfound@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockRejectedValue(new NotFoundError('User not found')),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'photo.jpg';
      const mimeType = 'image/jpeg';

      minioClient.putObject.mockResolvedValue(true);

      await expect(
        uploadProfilePicture(mockUser, fileBuffer, originalFileName, mimeType)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================
  // MIME TYPE HANDLING
  // ============================================================
  describe('MIME Type Handling', () => {
    it('should use default MIME type if not provided', async () => {
      const mockUser = {
        id: 'user-default-mime',
        fullname: 'Default MIME',
        email: 'default@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-data');
      const originalFileName = 'photo.jpg';
      // No mimeType provided - should use default

      minioClient.putObject.mockResolvedValue(true);

      await uploadProfilePicture(mockUser, fileBuffer, originalFileName); // No mimeType

      const putObjectCall = minioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];

      expect(metadata['Content-Type']).toBe('image/jpeg'); // Default
    });

    it('should handle different image MIME types correctly', async () => {
      const mockUser = {
        id: 'user-mime-types',
        fullname: 'MIME Types Test',
        email: 'mimetypes@example.com',
        role: 'USER',
        profilePicture: null,
        updatedAt: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      const fileBuffer = Buffer.from('image-data');
      minioClient.putObject.mockResolvedValue(true);

      // Test image/jpeg
      await uploadProfilePicture(mockUser, fileBuffer, 'test.jpg', 'image/jpeg');
      expect(minioClient.putObject.mock.calls[0][4]['Content-Type']).toBe('image/jpeg');

      // Test image/png
      await uploadProfilePicture(mockUser, fileBuffer, 'test.png', 'image/png');
      expect(minioClient.putObject.mock.calls[1][4]['Content-Type']).toBe('image/png');
    });
  });
});
