// services/userService.js
const { User } = require('../models');
const createLogger = require('../utils/logger');

const logger = createLogger('MODULE:USER_SERVICE');

class UserService {
    // update user profile (fullname only for now)
    async updateProfile(userId, updates) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            // Check if email already exists
            if (updates.email && updates.email !== user.email) {
                const existing = await User.findOne({ where: { email: updates.email } });
                if (existing) {
                    const error = new Error('Email already in use');
                    error.statusCode = 409;
                    throw error;
                }
            }

            // Only update provided fields
            if (updates.fullname) user.fullname = updates.fullname;
            if (updates.email) user.email = updates.email;
            user.updatedAt = new Date();
            user.roles = user.roles || 'USER'; //Here i Ensure roles is not null
            // user.roles = user.roles || ['USER']; //Here i Ensure roles is not null

            await user.save();

            logger.info(`User profile updated for id=${user.id}`);

            return {
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: user.id,
                    fullname: user.fullname,
                    email: user.email,
                    roles: user.roles,
                    updated_at: user.updatedAt,
                },
            };
        } catch (err) {
            logger.error(`updateProfile failed for id=${userId} - ${err.message}`);
            const error = new Error(err.message);
            error.statusCode = err.statusCode || 500;
            throw error;
        }
    }
}

module.exports = new UserService();
