// utils/logger.js

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

const levels = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

const logger = (moduleName) => {
  return {
    info: (message, ...additionalArgs) => {
      console.log(
        `${colors.dim}${new Date().toISOString()}${colors.reset} ` +
          `${colors.cyan}[${moduleName}]${colors.reset} ` +
          `${colors.green}${levels.info}:${colors.reset} ` +
          `${message}${additionalArgs.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))}`
      );
    },
    warn: (message) => {
      // eslint-disable-next-line no-console
      console.warn(
        `${colors.dim}${new Date().toISOString()}${colors.reset} ` +
          `${colors.cyan}[${moduleName}]${colors.reset} ` +
          `${colors.yellow}${levels.warn}:${colors.reset} ` +
          `${colors.yellow}${message}${colors.reset}`
      );
    },
    error: (message) => {
      console.error(
        `${colors.dim}${new Date().toISOString()}${colors.reset} ` +
          `${colors.cyan}[${moduleName}]${colors.reset} ` +
          `${colors.red}${colors.bright}${levels.error}:${colors.reset} ` +
          `${colors.red}${message}${colors.reset}`
      );
    },
  };
};

module.exports = logger;
