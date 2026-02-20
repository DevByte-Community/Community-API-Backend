const createLogger = require('../utils/logger');
const logger = createLogger('ADMIN_AUDIT');


const adminAuditLogger = (req, _res, next) => {
    if (req.user) {
        logger.info('Admin route accessed', {
            userId: req.user.id,
            role: req.user.role,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }

    next();
};

module.exports = adminAuditLogger;