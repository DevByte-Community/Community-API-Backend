// middleware/authMiddleware.js
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const redisClient = require("../config/redis"); // new
const User = require('../models/user');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.ACCESS_TOKEN_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {

      const token = ExtractJwt.fromAuthHeaderAsBearerToken()( // extract raw token
        { headers: { authorization: `Bearer ${jwt_payload?.token}` } }
      );

      // Check Redis blacklist
      if (token) {
        const isBlacklisted = await redisClient.get(`bl_rt_${token}`);
        if (isBlacklisted) {
          return done(null, false, { message: "Token invalidated" });
        }
      }
      
      const user = await User.findByPk(jwt_payload.id);
      if (user) return done(null, user);
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;