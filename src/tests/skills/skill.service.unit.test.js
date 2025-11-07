const { Skill } = require('../../models');
const skillService = require('../../services/skillService');
const { UniqueConstraintError } = require('sequelize');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

jest.mock('../../models', () => ({
  Skill: {
    create: jest.fn(),
    count: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe('SkillService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  //   -------------- CREATE -------------
  describe('create', () => {
    it('should create new skill', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
        description: null,
        createdAt: new Date(),
      };

      // Mock function behavior
      Skill.create.mockResolvedValue(mockSkill);

      // Call the service
      const result = await skillService.create({
        name: 'Javascript',
        description: '',
      });

      //Expectations
      expect(Skill.create).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Skill created successfully',
        success: true,
        skill: {
          id: mockSkill.id,
          name: mockSkill.name,
          description: mockSkill.description || null,
          created_at: mockSkill.createdAt,
        },
      });
    });

    it('should throw an error if there is a skill with the same name', async () => {
      Skill.create.mockRejectedValue(new UniqueConstraintError());

      await expect(
        skillService.create({
          name: 'Javascript',
          description: '',
        })
      ).rejects.toThrow('This skill already exists.');
    });

    it('should throw a server error for other failures', async () => {
      Skill.create.mockRejectedValue(new Error('DB connection failed'));

      await expect(skillService.create({ name: 'Python', description: '' })).rejects.toThrow(
        'Failed to create skill due to a server error.'
      );
    });
  });

  //   -------------- UPDATE -------------
  describe('update', () => {
    it('should update existing skill', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
        description: '',
        updatedAt: new Date(),

        changed: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(),
      };

      // Mock function behavior
      Skill.findByPk.mockResolvedValue(mockSkill);

      mockSkill.description = 'Updated description';

      // Call the service
      const result = await skillService.update({
        id: 1,
        name: '',
        description: 'Updated description',
      });

      //Expectations
      expect(Skill.findByPk).toHaveBeenCalledWith(1);
      expect(mockSkill.changed).toHaveBeenCalled();
      expect(mockSkill.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Skill updated successfully',
        success: true,
        skill: {
          id: mockSkill.id,
          name: mockSkill.name,
          description: mockSkill.description || null,
          updated_at: mockSkill.updatedAt,
        },
      });
    });

    it('should return message when no changes detected', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
        description: '',
        updatedAt: new Date(),

        changed: jest.fn().mockReturnValue(false),
        save: jest.fn().mockResolvedValue(),
      };

      // Mock function behavior
      Skill.findByPk.mockResolvedValue(mockSkill);

      const result = await skillService.update({
        id: 1,
        name: '',
        description: '', // no real changes
      });

      expect(mockSkill.changed).toHaveBeenCalled();
      expect(mockSkill.save).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        message: 'No changes detected; resource state retained.',
        skill: {
          id: mockSkill.id,
          name: mockSkill.name,
          description: mockSkill.description || null,
          updated_at: mockSkill.updatedAt,
        },
      });
    });

    it('should throw 404 if skill not found', async () => {
      Skill.findByPk.mockResolvedValue(null);

      await expect(skillService.update({ id: 100 })).rejects.toThrow('Skill not found');
    });

    it('should throw an error if there is a skill with the same name', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
        description: '',
        updatedAt: new Date(),

        changed: jest.fn().mockReturnValue(true),
        save: jest.fn().mockRejectedValue(new UniqueConstraintError()),
      };

      Skill.findByPk.mockResolvedValue(mockSkill);

      await expect(
        skillService.update({
          name: 'Javascript',
          description: '',
        })
      ).rejects.toThrow('This skill already exists.');
    });

    it('should throw a server error for other failures', async () => {
      const mockSkill = {
        id: 2,
        name: 'Python',
        description: '',
        updatedAt: new Date(),

        changed: jest.fn().mockReturnValue(true),
        save: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      };

      Skill.findByPk.mockResolvedValue(mockSkill);

      await expect(skillService.update({ name: 'Python', description: '' })).rejects.toThrow(
        'Failed to update skill due to a server error.'
      );
    });
  });

  describe('getSkills', () => {
    it('should return paginated skills successfully', async () => {
      const mockSkills = [
        { id: 1, name: 'JavaScript', createdAt: new Date() },
        { id: 2, name: 'Python', createdAt: new Date() },
      ];

      Skill.count.mockResolvedValue(2);
      Skill.findAll.mockResolvedValue(mockSkills);

      const result = await skillService.getSkills(1, 10);

      expect(Skill.count).toHaveBeenCalled();
      expect(Skill.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name', 'description', 'createdAt'],
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });

      expect(result).toEqual({
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
    });

    it('should throw a server error for other failures', async () => {
      Skill.count.mockRejectedValue(new Error('DB connection failed'));

      await expect(skillService.getSkills(1, 10)).rejects.toThrow(
        'Failed to retrieve skills due to a server error.'
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing skill', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
      };

      Skill.findByPk.mockResolvedValue(mockSkill);
      Skill.destroy.mockResolvedValue(1);

      const result = await skillService.delete(1);

      expect(Skill.findByPk).toHaveBeenCalledWith(1);
      expect(Skill.destroy).toHaveBeenCalledWith({ where: { id: 1 } });

      expect(result).toEqual({
        success: true,
        message: 'Skill deleted successfully',
      });
    });

    it('should throw 404 if skill not found', async () => {
      Skill.findByPk.mockResolvedValue(null);

      await expect(skillService.delete({ id: 100 })).rejects.toThrow('Skill not found');
    });

    it('should throw 404 if no row was deleted', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
      };

      Skill.findByPk.mockResolvedValue(mockSkill);
      Skill.destroy.mockResolvedValue(0);

      await expect(skillService.delete(0)).rejects.toThrow('Skill not found or already deleted.');
    });

    it('should throw a server error for other failures', async () => {
      const mockSkill = {
        id: 1,
        name: 'Javascript',
      };

      Skill.findByPk.mockResolvedValue(mockSkill);
      Skill.destroy.mockRejectedValue(new Error('DB connection failed'));

      await expect(skillService.delete({ id: 1 })).rejects.toThrow(
        'Failed to delete skill due to a server error.'
      );
    });
  });
});
