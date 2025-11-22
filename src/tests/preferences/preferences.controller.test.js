// tests/controllers/preferenceController.unit.test.js

// ---- Mock service layer BEFORE import ----
const mockGetUserPreferences = jest.fn();
const mockUpdateUserPreferences = jest.fn();

jest.mock('../../services/preferenceService', () => ({
  getUserPreferences: (...args) => mockGetUserPreferences(...args),
  updateUserPreferences: (...args) => mockUpdateUserPreferences(...args),
}));

// ---- Mock logger ----
jest.mock('../../utils/logger', () =>
  jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }))
);

// ---- Mock asyncHandler to be transparent ----
jest.mock('../../middleware/errorHandler', () => ({
  asyncHandler: (fn) => fn,
}));

// ---- Mock validator (preferencesUpdateSchema) ----
const mockValidate = jest.fn();
jest.mock('../../utils/validator', () => ({
  preferencesUpdateSchema: {
    validate: (...args) => mockValidate(...args),
  },
}));

// ---- Import controller after mocks ----
const { getMyPreferences, updateMyPreferences } = require('../../controllers/preferenceController');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

// ---- Helpers ----
const mockRequest = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  body: {},
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('preferenceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------
  // getMyPreferences
  // -----------------------
  describe('getMyPreferences', () => {
    it('returns 200 with current preferences (happy path)', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const prefs = {
        visibility: true,
        notification: true,
        newsletter: true,
        appearance: 'system',
        language: 'en',
        timezone: 'UTC',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      mockGetUserPreferences.mockResolvedValueOnce(prefs);

      await getMyPreferences(req, res);

      expect(mockGetUserPreferences).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(prefs);
    });

    it('propagates service errors (e.g. NotFoundError)', async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockGetUserPreferences.mockRejectedValueOnce(new NotFoundError('Preferences not found'));

      await expect(getMyPreferences(req, res)).rejects.toThrow(NotFoundError);
      expect(mockGetUserPreferences).toHaveBeenCalledWith('user-123');
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -----------------------
  // updateMyPreferences
  // -----------------------
  describe('updateMyPreferences', () => {
    it('validates body and updates preferences (happy path)', async () => {
      const reqBody = { appearance: 'dark', newsletter: false };
      const req = mockRequest({ body: reqBody });
      const res = mockResponse();

      const validatedValue = { appearance: 'dark', newsletter: false };
      mockValidate.mockReturnValueOnce({ error: null, value: validatedValue });

      const updatedPrefs = {
        visibility: true,
        notification: true,
        newsletter: false,
        appearance: 'dark',
        language: 'en',
        timezone: 'UTC',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      };
      mockUpdateUserPreferences.mockResolvedValueOnce(updatedPrefs);

      await updateMyPreferences(req, res);

      expect(mockValidate).toHaveBeenCalledWith(reqBody);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith('user-123', validatedValue);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated',
        preferences: updatedPrefs,
      });
    });

    it('throws ValidationError when Joi validation fails', async () => {
      const reqBody = { appearance: 'blue' }; // invalid
      const req = mockRequest({ body: reqBody });
      const res = mockResponse();

      mockValidate.mockReturnValueOnce({
        error: { details: [{ message: 'appearance must be one of: light, dark, system' }] },
        value: null,
      });

      await expect(updateMyPreferences(req, res)).rejects.toThrow(ValidationError);
      expect(mockValidate).toHaveBeenCalledWith(reqBody);
      expect(mockUpdateUserPreferences).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('uses empty object when body is undefined', async () => {
      const req = mockRequest({ body: undefined });
      const res = mockResponse();

      const validatedValue = {}; // depends on your Joi schema; here we assume {} is OK
      mockValidate.mockReturnValueOnce({ error: null, value: validatedValue });

      const updatedPrefs = {
        visibility: true,
        notification: true,
        newsletter: true,
        appearance: 'system',
        language: 'en',
        timezone: 'UTC',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      };
      mockUpdateUserPreferences.mockResolvedValueOnce(updatedPrefs);

      await updateMyPreferences(req, res);

      // body should be normalized to {}
      expect(mockValidate).toHaveBeenCalledWith({});
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith('user-123', validatedValue);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated',
        preferences: updatedPrefs,
      });
    });

    it('propagates service ValidationError', async () => {
      const reqBody = { appearance: 'dark' };
      const req = mockRequest({ body: reqBody });
      const res = mockResponse();

      mockValidate.mockReturnValueOnce({ error: null, value: reqBody });

      mockUpdateUserPreferences.mockRejectedValueOnce(new ValidationError('Invalid preferences'));

      await expect(updateMyPreferences(req, res)).rejects.toThrow(ValidationError);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith('user-123', reqBody);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('propagates service NotFoundError', async () => {
      const reqBody = { appearance: 'dark' };
      const req = mockRequest({ body: reqBody });
      const res = mockResponse();

      mockValidate.mockReturnValueOnce({ error: null, value: reqBody });

      mockUpdateUserPreferences.mockRejectedValueOnce(new NotFoundError('Preferences not found'));

      await expect(updateMyPreferences(req, res)).rejects.toThrow(NotFoundError);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith('user-123', reqBody);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
