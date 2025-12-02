/**
 * @file tests/skill/skill.service.unit.test.js
 * @description Unit tests for skill service functions
 */

const {
  getAllSkills,
  getSkillById,
  createSkill,
  batchCreateSkills,
  updateSkill,
  deleteSkill,
} = require('../../services/skillService');
const { Skill, sequelize } = require('../../models');
const { NotFoundError, ConflictError, InternalServerError } = require('../../utils/customErrors');
const {
  getCachedSkillList,
  getCachedSkillCount,
  getCachedSkill,
  getCachedSkillNameLookup,
  cacheSkill,
  cacheSkillNameLookup,
  cacheSkillList,
  cacheSkillCount,
  invalidateAllSkillCaches,
  invalidateSkillCache,
  invalidateSkillNameCache,
} = require('../../utils/skillCache');

// 🧠 Mock dependencies
jest.mock('../../models', () => ({
  Skill: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../utils/skillCache', () => ({
  getCachedSkillList: jest.fn(),
  getCachedSkillCount: jest.fn(),
  getCachedSkill: jest.fn(),
  getCachedSkillNameLookup: jest.fn(),
  cacheSkill: jest.fn(),
  cacheSkillNameLookup: jest.fn(),
  cacheSkillList: jest.fn(),
  cacheSkillCount: jest.fn(),
  invalidateAllSkillCaches: jest.fn(),
  invalidateSkillCache: jest.fn(),
  invalidateSkillNameCache: jest.fn(),
}));

jest.mock('../../utils/logger', () =>
  jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }))
);

describe('SKILL_SERVICE', () => {
  const mockSkill = {
    id: 'skill-123',
    name: 'JavaScript',
    description: 'Programming language',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------
  // getAllSkills Tests
  // ----------------------------
  describe('getAllSkills', () => {
    it('✅ should return cached result when available', async () => {
      const cachedResult = {
        success: true,
        data: [mockSkill],
        pagination: { currentPage: 1, pageSize: 10, totalCount: 1 },
      };
      getCachedSkillList.mockResolvedValue(cachedResult);

      const result = await getAllSkills({ page: 1, pageSize: 10 });

      expect(getCachedSkillList).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(cachedResult);
      expect(Skill.findAll).not.toHaveBeenCalled();
    });

    it('✅ should fetch from database when cache miss', async () => {
      getCachedSkillList.mockResolvedValue(null);
      getCachedSkillCount.mockResolvedValue(null);
      Skill.count.mockResolvedValue(1);
      Skill.findAll.mockResolvedValue([mockSkill]);
      cacheSkillCount.mockResolvedValue();
      cacheSkillList.mockResolvedValue();

      const result = await getAllSkills({ page: 1, pageSize: 10 });

      expect(Skill.count).toHaveBeenCalled();
      expect(Skill.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('✅ should use default pagination values', async () => {
      getCachedSkillList.mockResolvedValue(null);
      getCachedSkillCount.mockResolvedValue(null);
      Skill.count.mockResolvedValue(0);
      Skill.findAll.mockResolvedValue([]);

      await getAllSkills({});

      expect(Skill.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
    });

    it('❌ should throw InternalServerError on database error', async () => {
      getCachedSkillList.mockResolvedValue(null);
      Skill.count.mockRejectedValue(new Error('DB Error'));

      await expect(getAllSkills({ page: 1, pageSize: 10 })).rejects.toThrow(InternalServerError);
    });
  });

  // ----------------------------
  // getSkillById Tests
  // ----------------------------
  describe('getSkillById', () => {
    it('✅ should return cached skill when available', async () => {
      getCachedSkill.mockResolvedValue(mockSkill);

      const result = await getSkillById('skill-123');

      expect(getCachedSkill).toHaveBeenCalledWith('skill-123');
      expect(result).toEqual(mockSkill);
      expect(Skill.findByPk).not.toHaveBeenCalled();
    });

    it('✅ should fetch from database when cache miss', async () => {
      getCachedSkill.mockResolvedValue(null);
      Skill.findByPk.mockResolvedValue(mockSkill);
      cacheSkill.mockResolvedValue();

      const result = await getSkillById('skill-123');

      expect(Skill.findByPk).toHaveBeenCalledWith('skill-123');
      expect(cacheSkill).toHaveBeenCalledWith('skill-123', mockSkill);
      expect(result).toEqual(mockSkill);
    });

    it('❌ should throw NotFoundError when skill does not exist', async () => {
      getCachedSkill.mockResolvedValue(null);
      Skill.findByPk.mockResolvedValue(null);

      await expect(getSkillById('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('❌ should throw InternalServerError on database error', async () => {
      getCachedSkill.mockResolvedValue(null);
      Skill.findByPk.mockRejectedValue(new Error('DB Error'));

      await expect(getSkillById('skill-123')).rejects.toThrow(InternalServerError);
    });
  });

  // ----------------------------
  // createSkill Tests
  // ----------------------------
  describe('createSkill', () => {
    it('✅ should create skill successfully', async () => {
      getCachedSkillNameLookup.mockResolvedValue(null);
      Skill.findOne.mockResolvedValue(null);
      Skill.create.mockResolvedValue(mockSkill);
      cacheSkill.mockResolvedValue();
      cacheSkillNameLookup.mockResolvedValue();
      invalidateAllSkillCaches.mockResolvedValue();

      const result = await createSkill({ name: 'JavaScript', description: 'Language' }, 'user-123');

      expect(Skill.create).toHaveBeenCalledWith({
        name: 'JavaScript',
        description: 'Language',
        createdBy: 'user-123',
      });
      expect(result).toEqual(mockSkill);
    });

    it('❌ should throw ConflictError when skill name already exists (cached)', async () => {
      getCachedSkillNameLookup.mockResolvedValue('existing-skill-id');

      await expect(createSkill({ name: 'JavaScript', description: 'Language' })).rejects.toThrow(
        ConflictError
      );
      expect(Skill.create).not.toHaveBeenCalled();
    });

    it('❌ should throw ConflictError when skill name already exists (database)', async () => {
      getCachedSkillNameLookup.mockResolvedValue(null);
      Skill.findOne.mockResolvedValue(mockSkill);
      cacheSkillNameLookup.mockResolvedValue();

      await expect(createSkill({ name: 'JavaScript', description: 'Language' })).rejects.toThrow(
        ConflictError
      );
      expect(Skill.create).not.toHaveBeenCalled();
    });

    it('❌ should throw InternalServerError on database error', async () => {
      getCachedSkillNameLookup.mockResolvedValue(null);
      Skill.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(createSkill({ name: 'JavaScript', description: 'Language' })).rejects.toThrow(
        InternalServerError
      );
    });
  });

  // ----------------------------
  // batchCreateSkills Tests
  // ----------------------------
  describe('batchCreateSkills', () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    beforeEach(() => {
      sequelize.transaction.mockResolvedValue(mockTransaction);
    });

    it('✅ should create multiple skills successfully', async () => {
      const skillsData = [
        { name: 'Python', description: 'Language' },
        { name: 'React', description: 'Library' },
      ];

      Skill.findOne
        .mockResolvedValueOnce(null) // Python doesn't exist
        .mockResolvedValueOnce(null); // React doesn't exist

      Skill.create
        .mockResolvedValueOnce({ id: 'skill-1', name: 'Python' })
        .mockResolvedValueOnce({ id: 'skill-2', name: 'React' });

      cacheSkill.mockResolvedValue();
      cacheSkillNameLookup.mockResolvedValue();
      invalidateAllSkillCaches.mockResolvedValue();

      const result = await batchCreateSkills(skillsData, 'user-123');

      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);
      expect(result.summary.skipped).toBe(0);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('✅ should skip duplicate skills', async () => {
      const skillsData = [
        { name: 'Python', description: 'Language' },
        { name: 'JavaScript', description: 'Language' },
      ];

      Skill.findOne
        .mockResolvedValueOnce(null) // Python doesn't exist
        .mockResolvedValueOnce(mockSkill); // JavaScript exists

      Skill.create.mockResolvedValueOnce({ id: 'skill-1', name: 'Python' });

      cacheSkill.mockResolvedValue();
      cacheSkillNameLookup.mockResolvedValue();
      invalidateAllSkillCaches.mockResolvedValue();

      const result = await batchCreateSkills(skillsData, 'user-123');

      expect(result.summary.created).toBe(1);
      expect(result.summary.skipped).toBe(1);
      expect(result.skipped[0].name).toBe('JavaScript');
    });

    it('❌ should handle errors gracefully and continue processing', async () => {
      const skillsData = [{ name: 'Python', description: 'Language' }];

      Skill.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await batchCreateSkills(skillsData, 'user-123');

      expect(result.summary.errors).toBe(1);
      expect(result.errors[0].error).toBe('DB Error');
      expect(mockTransaction.commit).toHaveBeenCalled(); // Transaction commits even with errors
    });
  });

  // ----------------------------
  // updateSkill Tests
  // ----------------------------
  describe('updateSkill', () => {
    it('✅ should update skill successfully', async () => {
      const updatedSkill = { ...mockSkill, name: 'TypeScript' };
      Skill.findByPk.mockResolvedValue(mockSkill);
      getCachedSkillNameLookup.mockResolvedValue(null);
      Skill.findOne.mockResolvedValue(null);
      mockSkill.save = jest.fn().mockResolvedValue(updatedSkill);
      invalidateSkillNameCache.mockResolvedValue();
      cacheSkillNameLookup.mockResolvedValue();
      invalidateSkillCache.mockResolvedValue();
      cacheSkill.mockResolvedValue();
      invalidateAllSkillCaches.mockResolvedValue();

      const result = await updateSkill('skill-123', { name: 'TypeScript' });

      expect(mockSkill.save).toHaveBeenCalled();
      expect(result.name).toBe('TypeScript');
    });

    it('❌ should throw NotFoundError when skill does not exist', async () => {
      Skill.findByPk.mockResolvedValue(null);

      await expect(updateSkill('non-existent', { name: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('❌ should throw ConflictError when new name conflicts', async () => {
      Skill.findByPk.mockResolvedValue(mockSkill);
      getCachedSkillNameLookup.mockResolvedValue('other-skill-id');

      await expect(updateSkill('skill-123', { name: 'Existing' })).rejects.toThrow(ConflictError);
    });
  });

  // ----------------------------
  // deleteSkill Tests
  // ----------------------------
  describe('deleteSkill', () => {
    it('✅ should delete skill successfully', async () => {
      Skill.findByPk.mockResolvedValue(mockSkill);
      mockSkill.destroy = jest.fn().mockResolvedValue(true);
      invalidateSkillCache.mockResolvedValue();
      invalidateSkillNameCache.mockResolvedValue();
      invalidateAllSkillCaches.mockResolvedValue();

      const result = await deleteSkill('skill-123');

      expect(mockSkill.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('❌ should throw NotFoundError when skill does not exist', async () => {
      Skill.findByPk.mockResolvedValue(null);

      await expect(deleteSkill('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('❌ should throw InternalServerError on database error', async () => {
      Skill.findByPk.mockRejectedValue(new Error('DB Error'));

      await expect(deleteSkill('skill-123')).rejects.toThrow(InternalServerError);
    });
  });
});
