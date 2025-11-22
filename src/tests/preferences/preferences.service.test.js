// tests/preferences/preferences.service.test.js

const {
  createDefaultUserPreferences,
  getUserPreferences,
  updateUserPreferences,
} = require('../../services/preferenceService');
const { InternalServerError, NotFoundError } = require('../../utils/customErrors');

// ---- Mocks ----
const mockCreate = jest.fn();
const mockFindOne = jest.fn();

jest.mock('../../models', () => ({
  Preference: {
    create: (...args) => mockCreate(...args),
    findOne: (...args) => mockFindOne(...args),
  },
}));

jest.mock('../../utils/logger', () =>
  jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }))
);

describe('PREFERENCES_SERVICE', () => {
  const basePref = {
    id: 'pref-1',
    userId: 'user-123',
    visibility: true,
    notification: true,
    newsletter: true,
    appearance: 'system',
    language: 'en',
    timezone: 'UTC',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    update: jest.fn().mockResolvedValue(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------
  // createDefaultUserPreferences
  // ---------------------------
  describe('createDefaultUserPreferences', () => {
    it('creates preferences with defaults for a user', async () => {
      mockCreate.mockResolvedValueOnce(basePref);

      const result = await createDefaultUserPreferences('user-123');

      expect(mockCreate).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(result).toEqual({
        visibility: true,
        notification: true,
        newsletter: true,
        appearance: 'system',
        language: 'en',
        timezone: 'UTC',
        createdAt: basePref.createdAt,
        updatedAt: basePref.updatedAt,
      });
    });

    it('wraps unexpected errors in InternalServerError', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB error'));

      await expect(createDefaultUserPreferences('user-123')).rejects.toThrow(InternalServerError);
    });
  });

  // ---------------------------
  // getUserPreferences
  // ---------------------------
  describe('getUserPreferences', () => {
    it('returns mapped preferences when found', async () => {
      mockFindOne.mockResolvedValueOnce(basePref);

      const result = await getUserPreferences('user-123');

      expect(mockFindOne).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(result).toEqual({
        visibility: true,
        notification: true,
        newsletter: true,
        appearance: 'system',
        language: 'en',
        timezone: 'UTC',
        createdAt: basePref.createdAt,
        updatedAt: basePref.updatedAt,
      });
    });

    it('throws NotFoundError when no preferences exist', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      await expect(getUserPreferences('user-123')).rejects.toThrow(NotFoundError);
    });

    it('wraps unexpected errors in InternalServerError', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('DB fail'));

      await expect(getUserPreferences('user-123')).rejects.toThrow(InternalServerError);
    });
  });

  // ---------------------------
  // updateUserPreferences
  // ---------------------------
  describe('updateUserPreferences', () => {
    it('updates existing preferences with provided fields', async () => {
      // simulate instance that gets mutated when update is called
      const prefInstance = {
        ...basePref,
        update: jest.fn().mockImplementation(async (fields) => {
          Object.assign(prefInstance, fields);
        }),
      };

      mockFindOne.mockResolvedValueOnce(prefInstance);

      const patch = { appearance: 'dark', newsletter: false };

      const result = await updateUserPreferences('user-123', patch);

      expect(mockFindOne).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(prefInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: 'dark',
          newsletter: false,
          updatedAt: expect.any(Date),
        })
      );

      // result reflects patched values
      expect(result).toEqual({
        visibility: true,
        notification: true,
        newsletter: false,
        appearance: 'dark',
        language: 'en',
        timezone: 'UTC',
        createdAt: basePref.createdAt,
        updatedAt: prefInstance.updatedAt,
      });
    });

    it('creates preferences if not found and applies patch (upsert behavior)', async () => {
      const newPref = {
        ...basePref,
        id: 'pref-2',
        userId: 'user-456',
        appearance: 'dark',
        newsletter: false,
      };

      mockFindOne.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newPref);

      const patch = { appearance: 'dark', newsletter: false };

      const result = await updateUserPreferences('user-456', patch);

      expect(mockFindOne).toHaveBeenCalledWith({ where: { userId: 'user-456' } });
      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-456',
        appearance: 'dark',
        newsletter: false,
      });

      expect(result).toEqual({
        visibility: true,
        notification: true,
        newsletter: false,
        appearance: 'dark',
        language: 'en',
        timezone: 'UTC',
        createdAt: newPref.createdAt,
        updatedAt: newPref.updatedAt,
      });
    });

    it('wraps unexpected errors in InternalServerError', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('DB exploded'));

      await expect(updateUserPreferences('user-x', { appearance: 'dark' })).rejects.toThrow(
        InternalServerError
      );
    });
  });
});
