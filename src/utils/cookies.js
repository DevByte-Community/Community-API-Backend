const cfg = require('./authCookieConfig');
const createLogger = require('./logger');

const logger = createLogger('COOKIES');

/**
 * Builds cookie options for Express res.cookie
 * @param {'access'|'refresh'} kind
 */
function cookieOptions(kind) {
  const maxAgeSeconds = kind === 'access' ? cfg.ACCESS_MAX_AGE : cfg.REFRESH_MAX_AGE;

  const base = {
    httpOnly: cfg.COOKIE_HTTPONLY,
    secure: cfg.COOKIE_SECURE,
    sameSite: cfg.COOKIE_SAMESITE,
    path: cfg.COOKIE_PATH,
    maxAge: maxAgeSeconds * 1000, // ms
  };

  // Only set domain if explicitly provided
  if (cfg.COOKIE_DOMAIN) {
    base.domain = cfg.COOKIE_DOMAIN;
  }

  return base;
}

function setAuthCookies(res, tokens) {
  const { accessToken, refreshToken } = tokens;
  res.cookie(cfg.ACCESS_COOKIE, accessToken, cookieOptions('access'));
  res.cookie(cfg.REFRESH_COOKIE, refreshToken, cookieOptions('refresh'));
  logger.info('Set cookies to response header successfully.');
}

function clearAuthCookies(res) {
  const clearOpts = (kind) => ({
    ...cookieOptions(kind),
    maxAge: 0,
  });
  res.clearCookie(cfg.ACCESS_COOKIE, clearOpts('access'));
  res.clearCookie(cfg.REFRESH_COOKIE, clearOpts('refresh'));
}

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  cfg,
};
