// tests/tech/tech.controller.unit.test.js

// -------------------------------------------------------
// STEP 1: Mock service dependencies BEFORE controller import
// -------------------------------------------------------
const mockCreateTech = jest.fn();
const mockGetAllTechs = jest.fn();
const mockGetTechById = jest.fn();
const mockUpdateTech = jest.fn();
const mockDeleteTech = jest.fn();

jest.mock('../../services/techService', () => ({
    createTech: mockCreateTech,
    getAllTechs: mockGetAllTechs,
    getTechById: mockGetTechById,
    updateTech: mockUpdateTech,
    deleteTech: mockDeleteTech,
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
// STEP 3: Mock asyncHandler (transparent)
// -------------------------------------------------------
jest.mock('../../middleware/errorHandler', () => ({
    asyncHandler: (fn) => fn,
}));

// -------------------------------------------------------
// STEP 4: Mock validator
// -------------------------------------------------------
const mockValidate = jest.fn();
jest.mock('../../utils/index', () => ({
    validate: (...args) => mockValidate(...args),
}));

// -------------------------------------------------------
// STEP 5: Import controller AFTER mocks
// -------------------------------------------------------
const {
    createTech,
    getAllTechs,
    getTechById,
    updateTech,
    deleteTech,
} = require('../../controllers/techController');

const { ValidationError } = require('../../utils/customErrors');

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const mockRequest = (overrides = {}) => ({
    user: { id: 'admin-1' },
    file: {
        buffer: Buffer.from('fake-icon'),
        originalname: 'icon.png',
        mimetype: 'image/png',
    },
    body: {},
    params: {},
    query: {},
    ...overrides,
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// -------------------------------------------------------
// TEST SUITE
// -------------------------------------------------------

describe('TechController', () => {
    beforeEach(() => jest.clearAllMocks());

    // ======================================================
    // createTech
    // ======================================================
    describe('createTech', () => {
        it('should create a tech successfully', async () => {
            const req = mockRequest({
                body: { name: 'NodeJS', description: 'Backend JS runtime' },
            });
            const res = mockResponse();

            const validated = {
                name: 'NodeJS',
                description: 'Backend JS runtime',
                icon: 'icon.png',
            };

            mockValidate.mockReturnValue({
                _value: validated,
                errorResponse: null,
            });

            const mockResult = {
                success: true,
                message: 'Tech created successfully',
                tech: validated,
            };

            mockCreateTech.mockResolvedValue(mockResult);

            await createTech(req, res);

            expect(mockCreateTech).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should return 400 if validation fails', async () => {
            const req = mockRequest();
            const res = mockResponse();

            mockValidate.mockReturnValue({
                _value: null,
                errorResponse: { success: false, message: 'Invalid data' },
            });

            await createTech(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid data',
            });
            expect(mockCreateTech).not.toHaveBeenCalled();
        });

        it('should throw ValidationError when no file is uploaded', async () => {
            const req = mockRequest({ file: undefined });
            const res = mockResponse();

            await createTech(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.any(Object));

        });
    });

    // ======================================================
    // getAllTechs
    // ======================================================
    describe('getAllTechs', () => {
        it('should return all techs', async () => {
            const req = mockRequest({ query: { search: 'js' } });
            const res = mockResponse();

            const mockResult = {
                success: true,
                techs: [{ id: '1', name: 'NodeJS' }],
            };

            mockGetAllTechs.mockResolvedValue(mockResult);

            await getAllTechs(req, res);

            expect(mockGetAllTechs).toHaveBeenCalledWith('js');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });
    });

    // ======================================================
    // getTechById
    // ======================================================
    describe('getTechById', () => {
        it('should return a tech successfully', async () => {
            const req = mockRequest({ params: { id: 'tech-1' } });
            const res = mockResponse();

            const mockResult = {
                success: true,
                tech: { id: 'tech-1', name: 'NodeJS' },
            };

            mockGetTechById.mockResolvedValue(mockResult);

            await getTechById(req, res);

            expect(mockGetTechById).toHaveBeenCalledWith('tech-1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });
    });

    // ======================================================
    // updateTech
    // ======================================================
    describe('updateTech', () => {
        it('should update a tech successfully', async () => {
            const req = mockRequest({
                params: { id: 'tech-1' },
                body: { name: 'ReactJS' },
            });
            const res = mockResponse();

            mockValidate.mockReturnValue({
                _value: { name: 'ReactJS' },
                errorResponse: null,
            });

            const mockResult = {
                success: true,
                message: 'Tech updated',
                tech: { id: 'tech-1', name: 'ReactJS' },
            };

            mockUpdateTech.mockResolvedValue(mockResult);

            await updateTech(req, res);

            expect(mockUpdateTech).toHaveBeenCalledWith(
                'tech-1',
                { name: 'ReactJS' },
                expect.any(Object)   // icon file
            );


            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });
    });

    // ======================================================
    // deleteTech
    // ======================================================
    describe('deleteTech', () => {
        it('should delete a tech successfully', async () => {
            const req = mockRequest({ params: { id: 'tech-1' } });
            const res = mockResponse();

            const mockResult = {
                success: true,
                message: 'Tech deleted',
            };

            mockDeleteTech.mockResolvedValue(mockResult);

            await deleteTech(req, res);

            expect(mockDeleteTech).toHaveBeenCalledWith('tech-1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });
    });
});
