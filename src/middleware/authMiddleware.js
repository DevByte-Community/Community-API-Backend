// middleware/authMiddleware.js
const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { ForbiddenError, UnauthorizedError } = require('../utils/customErrors');
const { User } = require('../models');
const { cfg } = require('../utils/cookies');

// security logging - forensic traceability hardening
const createLogger = require('../utils/logger');
const securityLogger = createLogger('SECURITY'); 


/**
 * Custom extractor: prefer HttpOnly cookie, fall back to Authorization header.
 */
function extractAccessToken(req) {
  // 1) Cookie (preferred)
  const cookieToken = req?.cookies?.[cfg.ACCESS_COOKIE];
  if (cookieToken && typeof cookieToken === 'string' && cookieToken.trim() !== '') {
    return cookieToken;
  }

  // 2) Authorization: Bearer <token>
  const auth = req?.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }

  return null;
}

const jwtOpts = {
  jwtFromRequest: extractAccessToken,
  secretOrKey: process.env.ACCESS_TOKEN_SECRET,
  passReqToCallback: false,
};

passport.use(
  new JwtStrategy(jwtOpts, async (jwtPayload, done) => {
    try {
      const userId = jwtPayload?.sub || jwtPayload?.id || jwtPayload?.userId;
      if (!userId) {
        return done(null, false, { name: 'JsonWebTokenError', message: 'Missing subject (sub)' });
      }

      const user = await User.findByPk(userId);
      if (user) return done(null, user);
      return done(null, false, { message: 'User not found' });
    } catch (err) {
      return done(err, false);
    }
  })
);

/**
 * Custom JWT authentication middleware with enhanced error messages
 * Wraps passport.authenticate to provide better error feedback
 */
const authenticateJWT = (req, res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    // security logging
    securityLogger.warn('Missing authentication token', {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    })
    return next(
      new UnauthorizedError(
        `Authentication required. Provide a valid token via HttpOnly cookie ${cfg.ACCESS_COOKIE}.`
      )
    );
  }

  // Use passport to validate the token
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      // security logging
      securityLogger.error('Authentication error occurred', {
        ip: req.ip,
        path: req.originalUrl,
        error: err.message,
      });

      return next(new UnauthorizedError('Authentication error occurred'));
    }

    if (!user) {
      // Provide specific error message based on the reason
      if (info && info.name === 'TokenExpiredError') {
        // Token expired
        securityLogger.warn('Expired token attempt', {
          ip: req.ip,
          path: req.originalUrl,
          method: req.method,
        });
        return next(new UnauthorizedError('Token has expired. Please login again.'));
      }
      if (info && info.name === 'JsonWebTokenError') {
        // Invalid token
        securityLogger.warn('Invalid token attempt', {
          ip: req.ip,
          path: req.originalUrl,
          method: req.method,
        });
        return next(new UnauthorizedError('Invalid token. Please provide a valid JWT token.'));
      }
      if (info && info.message === 'User not found') {
        // User not found
        securityLogger.warn('Token valid but user not found', {
          ip: req.ip,
          path: req.originalUrl,
          method: req.method,
        });
        return next(new UnauthorizedError('User associated with this token no longer exists.'));
      }

      securityLogger.warn('Authentication failed - invalid or expired token', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
      });
      return next(new UnauthorizedError('Authentication failed. Invalid or expired token.'));
    }

    // Successful authentication
    securityLogger.info('Authentication successful', {
      userId: user.id,
      role: user.role,
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
    });

    // Attach user to request
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Middleware to check if user has minimum required role
 * Uses hierarchical role checking
 *
 * @param {string} minRole - Minimum role required (USER, ADMIN, or ROOT)
 */
const requireRole = (minRole) => (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated.'));
  }

  if (!req.user.hasRole(minRole)) {
    // security logging
    securityLogger.warn('Role Violation attempt', {
      userId: req.user.id,
      role: req.user.role,
      requiredRole: minRole,
      path: req.originalUrl,
      ip: req.ip,
    });
    return next(new ForbiddenError(`Insufficient permissions. Minimum required role: ${minRole}`));
  }

  return next();
};

/**
 * Convenience middleware for common role requirements
 */
const requireAdmin = requireRole('ADMIN');
const requireRoot = requireRole('ROOT');

module.exports = {
  passport,
  authenticateJWT,
  requireAdmin,
  requireRoot,
};
