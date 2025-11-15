const parseBool = (env) => {
  return env == 'production';
};

const toInt = (v, fallback) => {
  const n = parseInt(`${v}`, 10);
  return Number.isFinite(n) ? n : fallback;
};

const cfg = {
  ACCESS_COOKIE: 'access_token',
  REFRESH_COOKIE: 'refresh_token',

  ACCESS_MAX_AGE: toInt(process.env.AUTH_ACCESS_MAX_AGE, 900), // seconds
  REFRESH_MAX_AGE: toInt(process.env.AUTH_REFRESH_MAX_AGE, 60 * 60 * 24 * 30), // seconds

  COOKIE_DOMAIN: parseBool(process.env.NODE_ENV) ? process.env.AUTH_COOKIE_DOMAIN : '', // set nothing when dev
  COOKIE_PATH: process.env.AUTH_COOKIE_PATH || '/',

  COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE === 'true',
  COOKIE_HTTPONLY: parseBool(process.env.NODE_ENV),
  COOKIE_SAMESITE: process.env.AUTH_COOKIE_SAMESITE,

  INCLUDE_TOKENS_IN_BODY: parseBool(process.env.NODE_ENV),
};

module.exports = cfg;
