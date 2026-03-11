/**
 * @file tests/learning/learning.service.unit.test.js
 * @description Unit tests for learningService module
 */

const {
    createLearning,
    getAllLearnings,
    getLearningById,
    updateLearning,
    deleteLearning,
    getMyLearnings,
} = require('../../services/learningService');
const {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    InternalServerError,
} = require('../../utils/customErrors');
const { Op } = require('sequelize');

// Mock dependencies
const mockLearningCreate = jest.fn();
const mockLearningFindByPk = jest.fn();
const mockLearningCount = jest.fn();
const mockLearningFindAll = jest.fn();
const mockLearningUpdate = jest.fn();
const mockLearningDestroy = jest.fn();
const mockLearningAddTechs = jest.fn();
const mockLearningSetTechs = jest.fn();
const mockTechFindAll = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.mock('../../models', () => ({
    Learning: {
        create: (...args) => mockLearningCreate(...args),
        findByPk: (...args) => mockLearningFindByPk(...args),
        count: (...args) => mockLearningCount(...args),
        findAll: (...args) => mockLearningFindAll(...args),
    },
    Tech: {
        findAll: (...args) => mockTechFindAll(...args),
    },
    User: {},
    sequelize: {
        transaction: (cb) => mockSequelizeTransaction(cb),
    },
}));

jest.mock('../../utils/logger', () =>
    jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
    }))
);

describe('LEARNING_SERVICE', () => {
    const mockUser = { id: 'user-123', hasRole: jest.fn().mockReturnValue(false) };
    const mockAdmin = { id: 'admin-123', hasRole: jest.fn().mockReturnValue(true) };
    const mockLearning = {
        id: 'learning-123',
        name: 'Test Learning',
        userId: 'user-123',
        addTechs: mockLearningAddTechs,
        setTechs: mockLearningSetTechs,
        update: mockLearningUpdate,
        destroy: mockLearningDestroy,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation for transaction
        mockSequelizeTransaction.mockImplementation(async (callback) => callback('mockTransaction'));
    });

    // createLearning Tests
    describe('createLearning', () => {
        const learningData = {
            name: 'Node.js',
            description: 'Intro',
            level: 'BEGINNER',
            techs: ['tech-1', 'tech-2'],
        };

        it('should create learning successfully with techs', async () => {
            const mockTechs = [{ id: 'tech-1' }, { id: 'tech-2' }];
            mockTechFindAll.mockResolvedValue(mockTechs);
            mockLearningCreate.mockResolvedValue(mockLearning);
            mockLearningFindByPk.mockResolvedValue(mockLearning);

            const result = await createLearning(mockUser, learningData);

            expect(mockTechFindAll).toHaveBeenCalledWith({
                where: { id: { [Op.in]: learningData.techs } },
            });
            expect(mockLearningCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Node.js',
                    userId: 'user-123',
                }),
                { transaction: 'mockTransaction' }
            );
            expect(mockLearningAddTechs).toHaveBeenCalledWith(
                learningData.techs,
                { transaction: 'mockTransaction' }
            );
            expect(result).toEqual(mockLearning);
        });

        it('should throw ValidationError if techs do not exist', async () => {
            mockTechFindAll.mockResolvedValue([{ id: 'tech-1' }]); // missing tech-2

            await expect(createLearning(mockUser, learningData)).rejects.toThrow(ValidationError);
            expect(mockLearningCreate).not.toHaveBeenCalled();
        });
    });

    // getAllLearnings Tests
    describe('getAllLearnings', () => {
        it('should return paginated learnings', async () => {
            mockLearningCount.mockResolvedValue(1);
            mockLearningFindAll.mockResolvedValue([mockLearning]);

            const result = await getAllLearnings({ page: 1, pageSize: 10 });

            expect(mockLearningCount).toHaveBeenCalled();
            expect(mockLearningFindAll).toHaveBeenCalled();
            expect(result.data).toEqual([mockLearning]);
            expect(result.pagination.totalItems).toBe(1);
        });

        it('should apply filters correctly', async () => {
            mockLearningCount.mockResolvedValue(0);
            mockLearningFindAll.mockResolvedValue([]);

            await getAllLearnings({ level: 'BEGINNER', userId: 'user-123' });

            expect(mockLearningFindAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { level: 'BEGINNER', userId: 'user-123' },
                })
            );
        });
    });

    // getLearningById Tests
    describe('getLearningById', () => {
        it('should return learning by ID', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);

            const result = await getLearningById('learning-123');

            expect(mockLearningFindByPk).toHaveBeenCalledWith('learning-123', expect.any(Object));
            expect(result).toEqual(mockLearning);
        });

        it('should throw NotFoundError if learning not found', async () => {
            mockLearningFindByPk.mockResolvedValue(null);

            await expect(getLearningById('invalid-id')).rejects.toThrow(NotFoundError);
        });
    });

    // updateLearning Tests
    describe('updateLearning', () => {
        it('should update learning successfully (Owner)', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);
            mockLearning.update.mockResolvedValue(mockLearning);

            const result = await updateLearning(mockUser, 'learning-123', { name: 'Updated' });

            expect(mockLearning.update).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Updated' })
            );
            expect(result).toEqual(mockLearning);
        });

        it('should update learning successfully (Admin)', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);
            mockLearning.update.mockResolvedValue(mockLearning);

            const result = await updateLearning(mockAdmin, 'learning-123', { name: 'Updated' });

            expect(mockLearning.update).toHaveBeenCalled();
            expect(result).toEqual(mockLearning);
        });

        it('should throw ForbiddenError if not owner and not admin', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);
            const otherUser = { id: 'other-user', hasRole: jest.fn().mockReturnValue(false) };

            await expect(
                updateLearning(otherUser, 'learning-123', { name: 'Updated' })
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ValidationError if updating with invalid techs', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);
            mockTechFindAll.mockResolvedValue([]); // No techs found

            await expect(
                updateLearning(mockUser, 'learning-123', { techs: ['invalid-tech'] })
            ).rejects.toThrow(ValidationError);
        });
    });

    // deleteLearning Tests
    describe('deleteLearning', () => {
        it('should delete learning successfully (Owner)', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);

            const result = await deleteLearning(mockUser, 'learning-123');

            expect(mockLearning.destroy).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should delete learning successfully (Admin)', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);

            const result = await deleteLearning(mockAdmin, 'learning-123');

            expect(mockLearning.destroy).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should throw ForbiddenError if not owner and not admin', async () => {
            mockLearningFindByPk.mockResolvedValue(mockLearning);
            const otherUser = { id: 'other-user', hasRole: jest.fn().mockReturnValue(false) };

            await expect(deleteLearning(otherUser, 'learning-123')).rejects.toThrow(ForbiddenError);
        });
    });

    // getMyLearnings Tests
    describe('getMyLearnings', () => {
        it('should return user learnings', async () => {
            mockLearningFindAll.mockResolvedValue([mockLearning]);

            const result = await getMyLearnings('user-123');

            expect(mockLearningFindAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'user-123' } })
            );
            expect(result).toEqual([mockLearning]);
        });
    });
});
