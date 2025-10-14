// tests/user.service.unit.test.js
const { User } = require('../../models');
const userService = require('../../services/userService');
const createLogger = require('../../utils/logger');

jest.mock('../../models', () => ({
    User: {
        findByPk: jest.fn(),
        findOne: jest.fn(),
    },
}));

jest.mock('../../utils/logger', () => jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
})));

describe('UserService', () => {
    const mockLogger = createLogger();

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ────────────────────────────────
    describe('updateProfile', () => {

        it('should throw error if user not found', async () => {
            User.findByPk.mockResolvedValue(null);

            await expect(userService.updateProfile(999, { fullname: 'No User' }))
                .rejects.toThrow('User not found');
        });

        it('should throw error if email already exists', async () => {
            const mockUser = {
                id: 1,
                fullname: 'Jane',
                email: 'old@example.com',
                save: jest.fn(),
            };

            const existingUser = { id: 2, email: 'new@example.com' };

            User.findByPk.mockResolvedValue(mockUser);
            User.findOne.mockResolvedValue(existingUser);

            await expect(
                userService.updateProfile(1, { email: 'new@example.com' })
            ).rejects.toThrow('Email already in use');
        });

        it('should only update provided fields and keep roles default', async () => {
            const mockUser = {
                id: 1,
                fullname: 'John',
                email: 'john@example.com',
                roles: null,
                save: jest.fn(),
            };

            User.findByPk.mockResolvedValue(mockUser);
            User.findOne.mockResolvedValue(null);

            const result = await userService.updateProfile(1, { fullname: 'Updated John' });

            expect(mockUser.fullname).toBe('Updated John');
            expect(mockUser.roles).toBe('USER'); // ensures default set
            expect(result.success).toBe(true);
        });

    });
});
