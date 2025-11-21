/**
 * @file tests/services/user.service.unit.test.js
 * @description Unit tests for uploadProfilePicture and updateProfileData
 */

const {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
} = require('../../services/userService');
const { minioClient } = require('../../utils/minioClient');
const { User } = require('../../models');
const { InternalServerError, NotFoundError, ValidationError } = require('../../utils/customErrors');

// 🧠 Mock dependencies
jest.mock('../../utils/minioClient', () => ({
  minioClient: {
    putObject: jest.fn(),
    removeObject: jest.fn(),
  },
  bucketName: 'test-bucket',
}));

jest.mock('../../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () =>
  jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }))
);

const mockCompare = jest.fn();
const mockHash = jest.fn();
jest.mock('bcrypt', () => ({
  compare: (...args) => mockCompare(...args),
  hash: (...args) => mockHash(...args),
}));

describe('USER_SERVICE', () => {
  const mockUser = {
    id: 1,
    fullname: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    profilePicture: 'test-bucket/profile_picture_1.png',
    password: 'hashed-old-password',
    update: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------
  // uploadProfilePicture Tests
  // ----------------------------
  describe('uploadProfilePicture', () => {
    const mockFileBuffer = Buffer.from('fake image data');
    const mockFileName = 'avatar.png';

    it('✅ should upload a new profile picture successfully', async () => {
      minioClient.putObject.mockResolvedValueOnce(true);
      minioClient.removeObject.mockResolvedValueOnce(true);

      const result = await uploadProfilePicture(
        mockUser,
        mockFileBuffer,
        mockFileName,
        'image/png'
      );

      expect(minioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringMatching(/profile_picture_1_/),
        mockFileBuffer,
        mockFileBuffer.length,
        { 'Content-Type': 'image/png' }
      );
      expect(mockUser.update).toHaveBeenCalled();
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).toHaveProperty('profilePicture', mockUser.profilePicture);
    });

    it('🧾 should delete old profile picture if it exists', async () => {
      minioClient.removeObject.mockResolvedValueOnce(true);
      minioClient.putObject.mockResolvedValueOnce(true);

      await uploadProfilePicture(mockUser, mockFileBuffer, mockFileName);
      expect(minioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'profile_picture_1.png');
    });

    it('⚠️ should handle MinIO upload failure gracefully', async () => {
      minioClient.putObject.mockRejectedValueOnce(new Error('MinIO upload failed'));

      await expect(uploadProfilePicture(mockUser, mockFileBuffer, mockFileName)).rejects.toThrow(
        InternalServerError
      );
    });
  });

  // ----------------------------
  // updateProfileData Tests
  // ----------------------------
  describe('updateProfileData', () => {
    it('✅ should update fullname and email successfully', async () => {
      User.findOne.mockResolvedValueOnce(null); // no conflict

      const updates = { fullname: 'Jane Doe', email: 'jane@example.com' };
      const result = await updateProfileData(mockUser, updates);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'jane@example.com' } });
      expect(mockUser.fullname).toBe('Jane Doe');
      expect(mockUser.email).toBe('jane@example.com');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('❌ should throw 404 if user is not found', async () => {
      await expect(updateProfileData(null, {})).rejects.toThrow('User not found');
    });

    it('❌ should throw 409 if email already exists', async () => {
      User.findOne.mockResolvedValueOnce({ id: 99, email: 'existing@example.com' });

      const updates = { email: 'existing@example.com' };
      await expect(updateProfileData(mockUser, updates)).rejects.toThrow('Email already in use');
    });

    it('⚠️ should wrap unexpected errors in InternalServerError', async () => {
      mockUser.save.mockRejectedValueOnce(new Error('DB failure'));

      const updates = { fullname: 'New Name' };
      await expect(updateProfileData(mockUser, updates)).rejects.toThrow(InternalServerError);
    });
  });

  // ----------------------------
  // deleteUserAccount Tests
  // ----------------------------
  describe('deleteUserAccount', () => {
    it('✅ deletes user account and profile picture when user exists', async () => {
      const mockUserForDelete = {
        id: 'user-123',
        email: 'user@example.com',
        profilePicture: 'test-bucket/profile_picture_1.png',
        destroy: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUserForDelete);
      minioClient.removeObject.mockResolvedValueOnce(true);

      const result = await deleteUserAccount('user-123', 'privacy');

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(minioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'profile_picture_1.png');
      expect(mockUserForDelete.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('✅ deletes user account without calling MinIO when no profilePicture', async () => {
      const mockUserNoPicture = {
        id: 'user-456',
        email: 'nopicture@example.com',
        profilePicture: null,
        destroy: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUserNoPicture);

      const result = await deleteUserAccount('user-456', 'privacy');

      expect(User.findByPk).toHaveBeenCalledWith('user-456');
      expect(minioClient.removeObject).not.toHaveBeenCalled();
      expect(mockUserNoPicture.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('❌ throws NotFoundError when user is not found', async () => {
      User.findByPk.mockResolvedValueOnce(null);

      await expect(deleteUserAccount('missing-id', 'privacy')).rejects.toThrow(NotFoundError);

      expect(User.findByPk).toHaveBeenCalledWith('missing-id');
      expect(minioClient.removeObject).not.toHaveBeenCalled();
    });

    it('⚠️ wraps unexpected errors in InternalServerError', async () => {
      User.findByPk.mockRejectedValueOnce(new Error('DB down'));

      await expect(deleteUserAccount('user-123', 'privacy')).rejects.toThrow(InternalServerError);

      // No MinIO call because we never got a user
      expect(minioClient.removeObject).not.toHaveBeenCalled();
    });
  });

  // ----------------------------
  // changeUserPassword Tests
  // ----------------------------
  describe('changeUserPassword', () => {
    it('✅ updates password when current password is correct and new password is valid', async () => {
      const user = {
        ...mockUser,
        update: jest.fn().mockResolvedValue(true),
      };

      mockCompare.mockResolvedValueOnce(true); // currentPassword matches
      mockHash.mockResolvedValueOnce('hashed-new-password');

      const result = await changeUserPassword(user, 'OldPassword123!', 'NewPassword456!');

      expect(mockCompare).toHaveBeenCalledWith('OldPassword123!', user.password);
      expect(mockHash).toHaveBeenCalledWith('NewPassword456!', expect.any(Number));
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-new-password',
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toBe(true);
    });

    it('❌ throws ValidationError when current password is incorrect', async () => {
      const user = { ...mockUser };

      mockCompare.mockResolvedValueOnce(false); // bcrypt.compare → false

      await expect(changeUserPassword(user, 'WrongCurrent123!', 'NewPassword456!')).rejects.toThrow(
        ValidationError
      );

      expect(mockCompare).toHaveBeenCalledWith('WrongCurrent123!', user.password);
      expect(mockHash).not.toHaveBeenCalled();
      expect(user.update).not.toHaveBeenCalled();
    });

    it('❌ throws ValidationError when new password equals current password (plain text)', async () => {
      const user = { ...mockUser };

      // current password check passes
      mockCompare.mockResolvedValueOnce(true);

      await expect(
        changeUserPassword(user, 'SamePassword123!', 'SamePassword123!')
      ).rejects.toThrow(ValidationError);

      // we still checked compare, but should NOT hash or update
      expect(mockCompare).toHaveBeenCalledWith('SamePassword123!', user.password);
      expect(mockHash).not.toHaveBeenCalled();
      expect(user.update).not.toHaveBeenCalled();
    });

    it('⚠️ wraps unexpected errors in InternalServerError (e.g. DB update fails)', async () => {
      const user = {
        ...mockUser,
        update: jest.fn().mockRejectedValue(new Error('DB failure')),
      };

      mockCompare.mockResolvedValueOnce(true);
      mockHash.mockResolvedValueOnce('hashed-new-password');

      await expect(changeUserPassword(user, 'OldPassword123!', 'NewPassword456!')).rejects.toThrow(
        InternalServerError
      );

      expect(mockCompare).toHaveBeenCalledWith('OldPassword123!', user.password);
      expect(mockHash).toHaveBeenCalledWith('NewPassword456!', expect.any(Number));
      expect(user.update).toHaveBeenCalled();
    });
  });
});
