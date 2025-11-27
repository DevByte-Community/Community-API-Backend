/**
 * @file tests/services/user.service.unit.test.js
 * @description Unit tests for uploadProfilePicture and updateProfileData
 */

const {
  uploadProfilePicture,
  updateProfileData,
  deleteUserAccount,
  changeUserPassword,
  getAllUsers,
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

const mockCount = jest.fn();
const mockFindAll = jest.fn();

jest.mock('../../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    count: (...args) => mockCount(...args),
    findAll: (...args) => mockFindAll(...args),
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

  // ----------------------------
  // getAllUsers Tests
  // ----------------------------
  describe('getAllUsers', () => {
    const mockUsers = [
      {
        id: 'user-1',
        fullname: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-20'),
      },
      {
        id: 'user-2',
        fullname: 'Jane Smith',
        email: 'jane@example.com',
        role: 'USER',
        createdAt: new Date('2025-01-16'),
        updatedAt: new Date('2025-01-21'),
      },
    ];

    beforeEach(() => {
      mockCount.mockClear();
      mockFindAll.mockClear();
    });

    it('✅ should return paginated users with default pagination', async () => {
      mockCount.mockResolvedValueOnce(2);
      mockFindAll.mockResolvedValueOnce(mockUsers);

      const result = await getAllUsers();

      expect(mockCount).toHaveBeenCalled();
      expect(mockFindAll).toHaveBeenCalledWith({
        attributes: { exclude: ['password'] },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        currentPage: 1,
        limit: 10,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('✅ should return paginated users with custom page and limit', async () => {
      mockCount.mockResolvedValueOnce(25);
      mockFindAll.mockResolvedValueOnce(mockUsers);

      const result = await getAllUsers({ page: 2, limit: 10 });

      expect(mockFindAll).toHaveBeenCalledWith({
        attributes: { exclude: ['password'] },
        limit: 10,
        offset: 10,
        order: [['createdAt', 'DESC']],
      });
      expect(result.pagination).toEqual({
        currentPage: 2,
        limit: 10,
        totalCount: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('✅ should calculate hasNextPage and hasPrevPage correctly', async () => {
      mockCount.mockResolvedValueOnce(50);
      mockFindAll.mockResolvedValueOnce(mockUsers);

      // First page
      const result1 = await getAllUsers({ page: 1, limit: 10 });
      expect(result1.pagination.hasNextPage).toBe(true);
      expect(result1.pagination.hasPrevPage).toBe(false);

      // Last page
      mockCount.mockResolvedValueOnce(50);
      mockFindAll.mockResolvedValueOnce(mockUsers);
      const result2 = await getAllUsers({ page: 5, limit: 10 });
      expect(result2.pagination.hasNextPage).toBe(false);
      expect(result2.pagination.hasPrevPage).toBe(true);
    });

    it('⚠️ should throw InternalServerError on database error', async () => {
      mockCount.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(getAllUsers()).rejects.toThrow(InternalServerError);
    });
  });
});
