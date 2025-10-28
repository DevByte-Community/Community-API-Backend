// middleware/authMiddleware.js
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { UnauthorizedError } = require('../utils/customErrors');

const { User } = require('../models');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.ACCESS_TOKEN_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findByPk(jwt_payload.id);
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
  // Check if Authorization header exists
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(
      new UnauthorizedError(
        'Authentication required. Please provide a valid JWT token in the Authorization header.'
      )
    );
  }

  // Check if it's a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return next(
      new UnauthorizedError('Invalid authentication format. Use: Authorization: Bearer <token>')
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

module.exports = passport;
module.exports.authenticateJWT = authenticateJWT;
