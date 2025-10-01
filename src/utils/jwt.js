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

module.exports = { generateTokens };
