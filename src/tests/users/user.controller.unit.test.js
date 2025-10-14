// tests/user.controller.unit.test.js
jest.mock('../../services/userService', () => ({
    updateProfile: jest.fn(),
}));

jest.mock('../../utils/index', () => ({
    validate: jest.fn(),
}));

// We won’t need to mock logger’s internals — it’s side-effect only.
const userService = require('../../services/userService');
const Validator = require('../../utils/index');
const userController = require('../../controllers/userController');

// Mock response helper
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('UserController', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    // ---------------- UPDATE PROFILE ----------------
    describe('updateProfile', () => {
        it('should return 200 on successful profile update', async () => {
            const req = {
                user: { id: 1 },
                body: { fullname: 'John Doe', phone: '1234567890' },
            };
            const res = mockResponse();

            const mockValidated = { fullname: 'John Doe', phone: '1234567890' };
            const mockResult = { success: true, message: 'Profile updated successfully' };

            Validator.validate.mockReturnValue({
                _value: mockValidated,
                errorResponse: null,
            });
            userService.updateProfile.mockResolvedValue(mockResult);

            await userController.updateProfile(req, res);

            expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
            expect(userService.updateProfile).toHaveBeenCalledWith(1, mockValidated);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should return 400 when validation fails', async () => {
            const req = {
                user: { id: 1 },
                body: { fullname: '', phone: '' },
            };
            const res = mockResponse();

            Validator.validate.mockReturnValue({
                errorResponse: { success: false, message: 'Validation failed' },
            });

            await userController.updateProfile(req, res);

            expect(Validator.validate).toHaveBeenCalledWith(expect.anything(), req.body);
            expect(userService.updateProfile).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
            });
        });

        it('should return 404 when user not found', async () => {
            const req = {
                user: { id: 999 },
                body: { fullname: 'John Doe', phone: '1234567890' },
            };
            const res = mockResponse();

            const error = new Error('User not found');
            error.statusCode = 404;

            Validator.validate.mockReturnValue({
                _value: req.body,
                errorResponse: null,
            });
            userService.updateProfile.mockRejectedValue(error);

            await userController.updateProfile(req, res);

            expect(userService.updateProfile).toHaveBeenCalledWith(999, req.body);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
            });
        });

        it('should return 500 for unexpected errors', async () => {
            const req = {
                user: { id: 1 },
                body: { fullname: 'Jane Doe', phone: '5555555555' },
            };
            const res = mockResponse();

            const error = new Error('Database failure');
            Validator.validate.mockReturnValue({
                _value: req.body,
                errorResponse: null,
            });
            userService.updateProfile.mockRejectedValue(error);

            await userController.updateProfile(req, res);

            expect(userService.updateProfile).toHaveBeenCalledWith(1, req.body);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Database failure',
            });
        });

        // it('should handle missing req.user gracefully', async () => {
        //     const req = { body: { fullname: 'Jane Doe', phone: '9999999999' } };
        //     const res = mockResponse();

        //     const validated = { _value: req.body, errorResponse: null };
        //     Validator.validate.mockReturnValue(validated);

        //     // Simulate Sequelize returning null (user not found)
        //     const error = new Error('User not found');
        //     error.statusCode = 404;
        //     userService.updateProfile.mockRejectedValue(error);

        //     await userController.updateProfile(req, res);

        //     expect(userService.updateProfile).toHaveBeenCalledWith(undefined, validated._value);
        //     expect(res.status).toHaveBeenCalledWith(404);
        //     expect(res.json).toHaveBeenCalledWith({
        //         success: false,
        //         message: 'User not found',
        //     });
        // });


    });
});
