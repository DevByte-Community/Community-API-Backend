// middleware/authMiddleware.js
const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { UnauthorizedError } = require('../utils/customErrors');
const { User } = require('../models');
const { cfg } = require('../utils/cookies');

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
    return next(
      new UnauthorizedError(
        `Authentication required. Provide a valid token via HttpOnly cookie ${cfg.ACCESS_COOKIE}.`
      )
    );
  }

  // Use passport to validate the token
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(new UnauthorizedError('Authentication error occurred'));
    }

    if (!user) {
      // Provide specific error message based on the reason
      if (info && info.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token has expired. Please login again.'));
      }
      if (info && info.name === 'JsonWebTokenError') {
        return next(new UnauthorizedError('Invalid token. Please provide a valid JWT token.'));
      }
      if (info && info.message === 'User not found') {
        return next(new UnauthorizedError('User associated with this token no longer exists.'));
      }
      return next(new UnauthorizedError('Authentication failed. Invalid or expired token.'));
    }

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
    return next(
      new UnauthorizedError(`Insufficient permissions. Minimum required role: ${minRole}`)
    );
  }

  return next();
};

/**
 * Convenience middleware for common role requirements
 */
const requireAdmin = requireRole('ADMIN');
const requireRoot = requireRole('ROOT');

module.exports = passport;
module.exports.authenticateJWT = authenticateJWT;
module.exports.requireAdmin = requireAdmin;
module.exports.requireRoot = requireRoot;
