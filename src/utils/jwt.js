// utils/jwt.js
const jwt = require('jsonwebtoken');
const cookiesConfig = require('./authCookieConfig');

function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    roles: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: cookiesConfig.ACCESS_MAX_AGE + 's',
  });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: cookiesConfig.REFRESH_MAX_AGE + 's',
  });

  return { accessToken, refreshToken };
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}

module.exports = {
  generateTokens,
  verifyRefreshToken,
};
