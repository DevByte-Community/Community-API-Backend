const Validator = require('../../utils/index');
const skillService = require('../../services/skillService');
const skillController = require('../../controllers/skillController');

// Helper for mock response
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock('../../utils/index', () => ({
  validate: jest.fn(),
}));

jest.mock('../../services/skillService', () => ({
  create: jest.fn(),
  update: jest.fn(),
  getSkills: jest.fn(),
  delete: jest.fn(),
}));

describe('SkillController', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ------------- CREATE --------------
  describe('create', () => {
    it('Should return 201 on success', async () => {
      const req = {
        body: { name: 'Javascript', description: '' },
      };

      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { name: 'Javascript', description: '' },
        errorResponse: null,
      });

      skillService.create.mockResolvedValue({
        message: 'Skill created successfully',
        success: true,
        skill: {
          id: 1,
          name: 'Javascript',
          description: '',
          created_at: new Date(),
        },
      });

      await skillController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Skill created successfully',
          success: true,
        })
      );
    });

    it('should return 400 on validation error', async () => {
      const req = { body: { name: '', description: '' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await skillController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });

    it('should throw a server error for other failures', async () => {
      const req = {
        body: { name: 'Javascript', description: '' },
      };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { name: 'Javascript', description: '' },
        errorResponse: null,
      });

      skillService.create.mockRejectedValue(new Error('DB connection failed'));

      await skillController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'DB connection failed',
        })
      );
    });
  });

  //   -------------- UPDATE --------------
  describe('update', () => {
    it('should update an existing skill', async () => {
      const req = {
        body: { name: 'Javascript', description: 'update description' },
        params: { id: ' 1' },
      };
      const res = mockResponse();

      Validator.validate
        .mockReturnValueOnce({
          _value: { id: 1 },
          errorResponse: null,
        })
        .mockReturnValueOnce({
          _value: { name: 'Javascript', description: 'update description' },
          errorResponse: null,
        });

      skillService.update.mockResolvedValue({
        message: 'Skill updated successfully',
        success: true,
        skill: {
          id: 1,
          name: 'Javascript',
          description: 'updated description',
          updated_at: new Date(),
        },
      });

      await skillController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Skill updated successfully', success: true })
      );
    });
    it('should return 400 on validation error', async () => {
      const req = { body: { name: '', description: '' }, params: { id: '' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await skillController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });
    it('should throw a server error for other failures', async () => {
      const req = {
        body: { name: 'Javascript', description: 'update description' },
        params: { id: ' 1 ' },
      };
      const res = mockResponse();

      Validator.validate
        .mockReturnValue({
          _value: { id: 1 },
          errorResponse: null,
        })
        .mockReturnValue({
          _value: { name: 'Javascript', description: 'update description' },
          errorResponse: null,
        });

      skillService.update.mockRejectedValue(new Error('DB connection failed'));

      await skillController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'DB connection failed',
        })
      );
    });
  });

  //   ----------------- GET-SKILLS --------------
  describe('getSKills', () => {
    const mockSkills = [
      { id: 1, name: 'Javascript', description: 'Frontend language', createdAt: new Date() },
      { id: 2, name: 'Python', description: 'Backend language', createdAt: new Date() },
    ];
    it('should return paginated skills successfully', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();

      skillService.getSkills.mockResolvedValue({
        success: true,
        skills: mockSkills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description || null,
          created_at: skill.createdAt,
        })),
        pagination: {
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 10,
        },
      });

      await skillController.getSkills(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
    it('should return 400 if query values are less than 1', async () => {
      const req = { query: { page: '0', limit: '0' } };
      const res = mockResponse();

      await skillController.getSkills(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Page and limit must be positive numbers.',
        })
      );
    });
    it('should throw a server error for other failures', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();

      skillService.getSkills.mockRejectedValue(new Error('DB connection failed'));

      await skillController.getSkills(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'DB connection failed',
        })
      );
    });
  });

  //   -------------- DELETE ----------------
  describe('delete', () => {
    it('should delete an existing skill', async () => {
      const req = { params: { id: '1' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { id: 1 },
        errorResponse: null,
      });

      skillService.delete.mockResolvedValue({
        success: true,
        message: 'Skill deleted successfully',
      });

      await skillController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Skill deleted successfully',
        })
      );
    });
    it('should return 400 on validation error', async () => {
      const req = { params: { id: ' 0' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        errorResponse: { success: false, message: 'Validation failed' },
      });

      await skillController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });
    it('should throw a server error for other failures', async () => {
      const req = { params: { id: '1' } };
      const res = mockResponse();

      Validator.validate.mockReturnValue({
        _value: { id: 1 },
        errorResponse: null,
      });

      skillService.delete.mockRejectedValue(new Error('DB connection failed'));

      await skillController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'DB connection failed',
        })
      );
    });
  });
});
