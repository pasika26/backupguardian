const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with context
  logger.logError('Unhandled error occurred', err, {
    url: req.url,
    method: req.method,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      success: false,
      message,
      statusCode: 400
    };
    logger.warn('Validation error', { message, url: req.url });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      statusCode: 401
    };
    logger.warn('JWT error', { message: err.message, url: req.url });
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      statusCode: 401
    };
    logger.warn('Token expired', { url: req.url, userId: req.user?.id });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File too large. Maximum size is 100MB',
      statusCode: 413
    };
    logger.warn('File too large', { url: req.url, userId: req.user?.id });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      success: false,
      message: 'Unexpected file field',
      statusCode: 400
    };
    logger.warn('Unexpected file field', { url: req.url });
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === '23505') {
    error = {
      success: false,
      message: 'Resource already exists',
      statusCode: 409
    };
    logger.warn('Database constraint violation', { code: err.code, url: req.url });
  }

  if (err.code === '23503') {
    error = {
      success: false,
      message: 'Invalid reference to related resource',
      statusCode: 400
    };
    logger.warn('Foreign key violation', { code: err.code, url: req.url });
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    error = {
      success: false,
      message: 'Database connection failed',
      statusCode: 503
    };
    logger.error('Database connection error', err, { url: req.url });
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      success: false,
      message: 'Too many requests. Please try again later.',
      statusCode: 429
    };
    logger.warn('Rate limit exceeded', { url: req.url, ip: req.ip });
  }

  // Docker/external service errors
  if (err.message && err.message.includes('Docker')) {
    error = {
      success: false,
      message: 'Validation service temporarily unavailable',
      statusCode: 503
    };
    logger.error('Docker service error', err);
  }

  // Handle specific error types
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    error = {
      success: false,
      message: 'Unauthorized',
      statusCode: 401
    };
    logger.warn('Unauthorized access attempt', { url: req.url, ip: req.ip });
  }

  if (err.name === 'ForbiddenError') {
    error = {
      success: false,
      message: 'Forbidden',
      statusCode: 403
    };
    logger.warn('Forbidden access attempt', { url: req.url, userId: req.user?.id });
  }

  if (err.name === 'NotFoundError') {
    error = {
      success: false,
      message: 'Not Found',
      statusCode: 404
    };
  }

  // Prevent sensitive information leakage in production
  if (process.env.NODE_ENV === 'production' && error.statusCode === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.statusCode).json({
    success: error.success,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

module.exports = errorHandler;
