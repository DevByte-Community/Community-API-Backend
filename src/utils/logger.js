// utils/logger.js
const levels = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

const logger = (moduleName) => {
  return {
    info: (message) => {
      console.log(`${new Date().toISOString()} [${moduleName}] ${levels.info}: ${message}`);
    },
    warn: (message) => {
      console.warn(`${new Date().toISOString()} [${moduleName}] ${levels.warn}: ${message}`);
    },
    error: (message) => {
      console.error(`${new Date().toISOString()} [${moduleName}] ${levels.error}: ${message}`);
    },
  };
};

module.exports = logger;
