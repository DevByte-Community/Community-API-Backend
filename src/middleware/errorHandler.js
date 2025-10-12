/**
 * Error Handler Middleware
 * ------------------------
 * Centralized error handling for the application
 */

const createLogger = require('../utils/logger');
const { AppError } = require('../utils/customErrors');

const logger = createLogger('ERROR_HANDLER');

/**
 * Handles Multer file upload errors
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: 400,
      message: 'File size exceeds the maximum limit of 5MB',
    };
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      statusCode: 400,
      message: 'Unexpected file field',
    };
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return {
      statusCode: 400,
      message: err.message || 'Invalid file type. Only JPEG and PNG images are allowed.',
    };
  }
  return {
    statusCode: 400,
    message: err.message || 'File upload error',
  };
};

/**
 * Handles Sequelize database errors
 */
const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    return {
      statusCode: 400,
      message: 'Validation error',
      errors: err.errors?.map((e) => e.message),
    };
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return {
      statusCode: 409,
      message: 'Duplicate entry',
      errors: err.errors?.map((e) => e.message),
    };
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return {
      statusCode: 400,
      message: 'Foreign key constraint violation',
    };
  }
  return {
    statusCode: 500,
    message: 'Database error',
  };
};

/**
 * Handles JWT errors
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token',
    };
  }
  if (err.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token expired',
    };
  }
  return {
    statusCode: 401,
    message: 'Authentication error',
  };
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Default error object
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error',
    success: false,
  };

  // Log the error (don't log sensitive data)
  const logMessage = `${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`;

  if (error.statusCode >= 500) {
    logger.error(logMessage);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  } else {
    logger.warn(logMessage);
  }

  // Handle specific error types
  if (err.name && err.name.includes('Multer')) {
    const multerError = handleMulterError(err);
    error = { ...error, ...multerError };
  } else if (err.name && err.name.includes('Sequelize')) {
    const sequelizeError = handleSequelizeError(err);
    error = { ...error, ...sequelizeError };
  } else if (err.name && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    const jwtError = handleJWTError(err);
    error = { ...error, ...jwtError };
  } else if (err instanceof AppError) {
    // Custom application errors
    error = {
      statusCode: err.statusCode,
      message: err.message,
      success: false,
    };
  }

  // Don't expose internal errors in production
  if (error.statusCode === 500 && process.env.NODE_ENV === 'production') {
    error.message = 'An unexpected error occurred';
  }

  // Build response object
  const response = {
    success: false,
    message: error.message,
  };

  // Send error response
  res.status(error.statusCode).json(response);
};

/**
 * Async error wrapper - catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
};
