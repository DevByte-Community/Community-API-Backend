/**
 * @file tests/learning/learning.controller.unit.test.js
 * @description Unit tests for learningController module
 */

// Mock service dependencies
const mockCreateLearning = jest.fn();
const mockGetAllLearnings = jest.fn();
const mockGetLearningById = jest.fn();
const mockUpdateLearning = jest.fn();
const mockDeleteLearning = jest.fn();
const mockGetMyLearnings = jest.fn();

jest.mock('../../services/learningService', () => ({
    createLearning: mockCreateLearning,
    getAllLearnings: mockGetAllLearnings,
    getLearningById: mockGetLearningById,
    updateLearning: mockUpdateLearning,
    deleteLearning: mockDeleteLearning,
    getMyLearnings: mockGetMyLearnings,
}));

// Mock logger
jest.mock('../../utils/logger', () =>
    jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
    }))
);

// Mock asyncHandler
jest.mock('../../middleware/errorHandler', () => ({
    asyncHandler: (fn) => fn,
}));

// Mock validators
const mockCreateLearningValidate = jest.fn();
const mockUpdateLearningValidate = jest.fn();
const mockLearningQueryValidate = jest.fn();
const mockLearningIdParamValidate = jest.fn();

jest.mock('../../utils/validator', () => {
    const actual = jest.requireActual('../../utils/validator');
    return {
        ...actual,
        createLearningSchema: {
            validate: (...args) => mockCreateLearningValidate(...args),
        },
        updateLearningSchema: {
            validate: (...args) => mockUpdateLearningValidate(...args),
        },
        learningQuerySchema: {
            validate: (...args) => mockLearningQueryValidate(...args),
        },
        learningIdParamSchema: {
            validate: (...args) => mockLearningIdParamValidate(...args),
        },
    };
});

const {
    createLearning,
    getAllLearnings,
    getLearningById,
    getMyLearnings,
    updateLearning,
    deleteLearning,
} = require('../../controllers/learningController');
const { ValidationError } = require('../../utils/customErrors');

// Helper functions
const mockRequest = (overrides = {}) => ({
    user: { id: 'user-123', hasRole: jest.fn().mockReturnValue(false) },
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

describe('LearningController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // createLearning Tests
    describe('createLearning', () => {
        it('should create learning successfully', async () => {
            const req = mockRequest({
                body: {
                    name: 'React Basics',
                    description: 'Learn React',
                    level: 'BEGINNER',
                },
            });
            const res = mockResponse();
            const mockLearning = { id: 'learning-123', name: 'React Basics' };

            mockCreateLearningValidate.mockReturnValue({
                error: null,
                value: req.body,
            });
            mockCreateLearning.mockResolvedValue(mockLearning);

            await createLearning(req, res);

            expect(mockCreateLearning).toHaveBeenCalledWith(req.user, req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Learning created successfully',
                data: mockLearning,
            });
        });

        it('should throw ValidationError if validation fails', async () => {
            const req = mockRequest({ body: {} });
            const res = mockResponse();

            mockCreateLearningValidate.mockReturnValue({
                error: { details: [{ message: 'Name is required' }] },
            });

            await expect(createLearning(req, res)).rejects.toThrow(ValidationError);
            expect(mockCreateLearning).not.toHaveBeenCalled();
        });
    });

    // getAllLearnings Tests
    describe('getAllLearnings', () => {
        it('should return all learnings', async () => {
            const req = mockRequest({ query: { page: 1 } });
            const res = mockResponse();
            const mockResult = { data: [], pagination: {} };

            mockLearningQueryValidate.mockReturnValue({
                error: null,
                value: { page: 1 },
            });
            mockGetAllLearnings.mockResolvedValue(mockResult);

            await getAllLearnings(req, res);

            expect(mockGetAllLearnings).toHaveBeenCalledWith({ page: 1 });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Learnings retrieved successfully',
                ...mockResult,
            });
        });

        it('should throw ValidationError if query invalid', async () => {
            const req = mockRequest({ query: { page: 'invalid' } });
            const res = mockResponse();

            mockLearningQueryValidate.mockReturnValue({
                error: { details: [{ message: 'Page must be number' }] },
            });

            await expect(getAllLearnings(req, res)).rejects.toThrow(ValidationError);
        });
    });


    // getLearningById Tests
    describe('getLearningById', () => {
        it('should return learning by ID', async () => {
            const req = mockRequest({ params: { id: 'learning-123' } });
            const res = mockResponse();
            const mockLearning = { id: 'learning-123' };

            mockLearningIdParamValidate.mockReturnValue({
                error: null,
                value: { id: 'learning-123' },
            });
            mockGetLearningById.mockResolvedValue(mockLearning);

            await getLearningById(req, res);

            expect(mockGetLearningById).toHaveBeenCalledWith('learning-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockLearning,
            });
        });
    });


    // getMyLearnings Tests
    describe('getMyLearnings', () => {
        it('should return user learnings', async () => {
            const req = mockRequest();
            const res = mockResponse();
            const mockLearnings = [{ id: 'learning-123' }];

            mockGetMyLearnings.mockResolvedValue(mockLearnings);

            await getMyLearnings(req, res);

            expect(mockGetMyLearnings).toHaveBeenCalledWith('user-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Your learnings retrieved successfully',
                data: mockLearnings,
            });
        });

        it('should return empty message if no learnings', async () => {
            const req = mockRequest();
            const res = mockResponse();

            mockGetMyLearnings.mockResolvedValue([]);

            await getMyLearnings(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'You have not created any learnings yet',
                data: [],
            });
        });
    });


    // updateLearning Tests
    describe('updateLearning', () => {
        it('should update learning successfully', async () => {
            const req = mockRequest({
                params: { id: 'learning-123' },
                body: { name: 'Updated' },
            });
            const res = mockResponse();
            const mockUpdated = { id: 'learning-123', name: 'Updated' };

            mockLearningIdParamValidate.mockReturnValue({
                error: null,
                value: { id: 'learning-123' },
            });
            mockUpdateLearningValidate.mockReturnValue({
                error: null,
                value: { name: 'Updated' },
            });
            mockUpdateLearning.mockResolvedValue(mockUpdated);

            await updateLearning(req, res);

            expect(mockUpdateLearning).toHaveBeenCalledWith(req.user, 'learning-123', {
                name: 'Updated',
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Learning updated successfully',
                data: mockUpdated,
            });
        });
    });


    // deleteLearning Tests
    describe('deleteLearning', () => {
        it('should delete learning successfully', async () => {
            const req = mockRequest({ params: { id: 'learning-123' } });
            const res = mockResponse();

            mockLearningIdParamValidate.mockReturnValue({
                error: null,
                value: { id: 'learning-123' },
            });
            mockDeleteLearning.mockResolvedValue(true);

            await deleteLearning(req, res);

            expect(mockDeleteLearning).toHaveBeenCalledWith(req.user, 'learning-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Learning deleted successfully',
            });
        });
    });
});
