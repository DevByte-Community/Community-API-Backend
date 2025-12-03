// tests/skill/skill.controller.unit.test.js

// -------------------------------------------------------
// STEP 1: Mock service dependencies BEFORE controller import
// -------------------------------------------------------
const mockGetAllSkills = jest.fn();
const mockGetSkillById = jest.fn();
const mockCreateSkill = jest.fn();
const mockBatchCreateSkills = jest.fn();
const mockUpdateSkill = jest.fn();
const mockDeleteSkill = jest.fn();

jest.mock('../../services/skillService', () => ({
  getAllSkills: mockGetAllSkills,
  getSkillById: mockGetSkillById,
  createSkill: mockCreateSkill,
  batchCreateSkills: mockBatchCreateSkills,
  updateSkill: mockUpdateSkill,
  deleteSkill: mockDeleteSkill,
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

// utils/validator — we override paginationQuerySchema
const mockPaginationQueryValidate = jest.fn();
jest.mock('../../utils/validator', () => {
  const actual = jest.requireActual('../../utils/validator');
  return {
    ...actual,
    paginationQuerySchema: {
      validate: (...args) => mockPaginationQueryValidate(...args),
    },
  };
});

// -------------------------------------------------------
// STEP 5: Import controller after mocks
// -------------------------------------------------------
const {
  getAllSkills: getAllSkillsController,
  getSkillById: getSkillByIdController,
  createSkill: createSkillController,
  batchCreateSkills: batchCreateSkillsController,
  updateSkill: updateSkillController,
  deleteSkill: deleteSkillController,
} = require('../../controllers/skillController');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

// -------------------------------------------------------
// STEP 6: Helpers
// -------------------------------------------------------
const mockRequest = (overrides = {}) => ({
  user: { id: 'user-123', email: 'admin@example.com', role: 'ADMIN' },
  body: {},
  query: {},
  params: {},
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('SKILL_CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================================================
  // getAllSkills TESTS
  // ======================================================
  describe('getAllSkills', () => {
    it('returns 200 with paginated skills when validation passes', async () => {
      const req = mockRequest({ query: { page: '1', pageSize: '10' } });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: null,
        value: { page: 1, pageSize: 10 },
      });

      const mockResult = {
        success: true,
        data: [{ id: 'skill-1', name: 'JavaScript' }],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      mockGetAllSkills.mockResolvedValue(mockResult);

      await getAllSkillsController(req, res);

      expect(mockPaginationQueryValidate).toHaveBeenCalledWith(req.query);
      expect(mockGetAllSkills).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skills retrieved successfully',
        ...mockResult,
      });
    });

    it('uses default pagination values when query params are missing', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: null,
        value: { page: 1, pageSize: 10 },
      });

      const mockResult = {
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      mockGetAllSkills.mockResolvedValue(mockResult);

      await getAllSkillsController(req, res);

      expect(mockGetAllSkills).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('throws ValidationError when query validation fails', async () => {
      const req = mockRequest({ query: { page: 'invalid' } });
      const res = mockResponse();

      mockPaginationQueryValidate.mockReturnValue({
        error: { details: [{ message: 'Page must be a number' }] },
        value: null,
      });

      await expect(getAllSkillsController(req, res)).rejects.toThrow(ValidationError);
      expect(mockGetAllSkills).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // getSkillById TESTS
  // ======================================================
  describe('getSkillById', () => {
    it('returns 200 with skill data when skill exists', async () => {
      const req = mockRequest({ params: { id: 'skill-123' } });
      const res = mockResponse();

      const mockSkill = {
        id: 'skill-123',
        name: 'JavaScript',
        description: 'Programming language',
      };

      mockGetSkillById.mockResolvedValue(mockSkill);

      await getSkillByIdController(req, res);

      expect(mockGetSkillById).toHaveBeenCalledWith('skill-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill retrieved successfully',
        skill: mockSkill,
      });
    });

    it('throws NotFoundError when skill does not exist', async () => {
      const req = mockRequest({ params: { id: 'non-existent' } });
      const res = mockResponse();

      mockGetSkillById.mockRejectedValue(new NotFoundError('Skill not found'));

      await expect(getSkillByIdController(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  // ======================================================
  // createSkill TESTS
  // ======================================================
  describe('createSkill', () => {
    it('returns 201 when skill is created successfully', async () => {
      const req = mockRequest({
        body: { name: 'Python', description: 'Programming language' },
        user: { id: 'admin-123' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: { name: 'Python', description: 'Programming language' },
        errorResponse: null,
      });

      const mockSkill = {
        id: 'skill-123',
        name: 'Python',
        description: 'Programming language',
        createdBy: 'admin-123',
      };

      mockCreateSkill.mockResolvedValue(mockSkill);

      await createSkillController(req, res);

      expect(mockValidate).toHaveBeenCalled();
      expect(mockCreateSkill).toHaveBeenCalledWith(
        { name: 'Python', description: 'Programming language' },
        'admin-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill created successfully',
        skill: mockSkill,
      });
    });

    it('throws ValidationError when validation fails', async () => {
      const req = mockRequest({
        body: { name: 'A' }, // Too short
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: null,
        errorResponse: { message: 'Skill name must be at least 2 characters long' },
      });

      await expect(createSkillController(req, res)).rejects.toThrow(ValidationError);
      expect(mockCreateSkill).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // batchCreateSkills TESTS
  // ======================================================
  describe('batchCreateSkills', () => {
    it('returns 201 when all skills are created successfully', async () => {
      const req = mockRequest({
        body: {
          skills: [
            { name: 'Python', description: 'Language' },
            { name: 'JavaScript', description: 'Language' },
          ],
        },
        user: { id: 'admin-123' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: {
          skills: [
            { name: 'Python', description: 'Language' },
            { name: 'JavaScript', description: 'Language' },
          ],
        },
        errorResponse: null,
      });

      const mockResult = {
        success: true,
        created: [
          { id: 'skill-1', name: 'Python' },
          { id: 'skill-2', name: 'JavaScript' },
        ],
        skipped: [],
        errors: [],
        summary: {
          total: 2,
          created: 2,
          skipped: 0,
          errors: 0,
        },
      };

      mockBatchCreateSkills.mockResolvedValue(mockResult);

      await batchCreateSkillsController(req, res);

      expect(mockBatchCreateSkills).toHaveBeenCalledWith(
        [
          { name: 'Python', description: 'Language' },
          { name: 'JavaScript', description: 'Language' },
        ],
        'admin-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 201 when there are skipped items but no errors', async () => {
      const req = mockRequest({
        body: {
          skills: [{ name: 'Python' }, { name: 'JavaScript' }],
        },
        user: { id: 'admin-123' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: {
          skills: [{ name: 'Python' }, { name: 'JavaScript' }],
        },
        errorResponse: null,
      });

      const mockResult = {
        success: true,
        created: [{ id: 'skill-1', name: 'Python' }],
        skipped: [{ index: 1, name: 'JavaScript', reason: 'Already exists' }],
        errors: [],
        summary: {
          total: 2,
          created: 1,
          skipped: 1,
          errors: 0,
        },
      };

      mockBatchCreateSkills.mockResolvedValue(mockResult);

      await batchCreateSkillsController(req, res);

      // 207 is only returned when there are errors, not when there are skipped items
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 207 when there are errors', async () => {
      const req = mockRequest({
        body: {
          skills: [{ name: 'Python' }],
        },
        user: { id: 'admin-123' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: {
          skills: [{ name: 'Python' }],
        },
        errorResponse: null,
      });

      const mockResult = {
        success: true,
        created: [],
        skipped: [],
        errors: [{ index: 0, name: 'Python', error: 'Some error' }],
        summary: {
          total: 1,
          created: 0,
          skipped: 0,
          errors: 1, // errors.length > 0 should trigger 207
        },
      };

      mockBatchCreateSkills.mockResolvedValue(mockResult);

      await batchCreateSkillsController(req, res);

      // The controller checks result.summary.errors.length > 0
      // Since errors.length is 1, it should return 207
      expect(res.status).toHaveBeenCalledWith(207);
      expect(res.json).toHaveBeenCalled();
    });

    it('throws ValidationError when validation fails', async () => {
      const req = mockRequest({
        body: { skills: [] }, // Empty array
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: null,
        errorResponse: { message: 'At least one skill must be provided' },
      });

      await expect(batchCreateSkillsController(req, res)).rejects.toThrow(ValidationError);
      expect(mockBatchCreateSkills).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // updateSkill TESTS
  // ======================================================
  describe('updateSkill', () => {
    it('returns 200 when skill is updated successfully', async () => {
      const req = mockRequest({
        params: { id: 'skill-123' },
        body: { name: 'TypeScript' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: { name: 'TypeScript' },
        errorResponse: null,
      });

      const mockSkill = {
        id: 'skill-123',
        name: 'TypeScript',
        description: 'Typed JavaScript',
      };

      mockUpdateSkill.mockResolvedValue(mockSkill);

      await updateSkillController(req, res);

      expect(mockUpdateSkill).toHaveBeenCalledWith('skill-123', { name: 'TypeScript' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill updated successfully',
        skill: mockSkill,
      });
    });

    it('throws ValidationError when validation fails', async () => {
      const req = mockRequest({
        params: { id: 'skill-123' },
        body: {}, // Empty body
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: null,
        errorResponse: { message: 'At least one field must be provided' },
      });

      await expect(updateSkillController(req, res)).rejects.toThrow(ValidationError);
      expect(mockUpdateSkill).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when skill does not exist', async () => {
      const req = mockRequest({
        params: { id: 'non-existent' },
        body: { name: 'New Name' },
      });
      const res = mockResponse();

      mockValidate.mockReturnValue({
        _value: { name: 'New Name' },
        errorResponse: null,
      });

      mockUpdateSkill.mockRejectedValue(new NotFoundError('Skill not found'));

      await expect(updateSkillController(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  // ======================================================
  // deleteSkill TESTS
  // ======================================================
  describe('deleteSkill', () => {
    it('returns 200 when skill is deleted successfully', async () => {
      const req = mockRequest({ params: { id: 'skill-123' } });
      const res = mockResponse();

      mockDeleteSkill.mockResolvedValue(true);

      await deleteSkillController(req, res);

      expect(mockDeleteSkill).toHaveBeenCalledWith('skill-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Skill deleted successfully',
      });
    });

    it('throws NotFoundError when skill does not exist', async () => {
      const req = mockRequest({ params: { id: 'non-existent' } });
      const res = mockResponse();

      mockDeleteSkill.mockRejectedValue(new NotFoundError('Skill not found'));

      await expect(deleteSkillController(req, res)).rejects.toThrow(NotFoundError);
    });
  });
});
