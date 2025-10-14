// utils/jwt.js
const jwt = require('jsonwebtoken');

function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    roles: user.roles,
  };

  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '30d',
  });

  return { accessToken, refreshToken };
}

/**
 * Verify access token and return decoded payload.
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = { generateTokens, verifyAccessToken };
