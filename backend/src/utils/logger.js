const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: { 
    service: 'backup-guardian',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write error logs to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write HTTP logs to access.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  }));
}

// Add helper methods for structured logging
logger.logError = (message, error, metadata = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    ...metadata
  });
};

logger.logValidation = (filename, status, duration, metadata = {}) => {
  logger.info(`Backup validation ${status}`, {
    filename,
    status,
    duration,
    category: 'validation',
    ...metadata
  });
};

logger.logUpload = (filename, size, userId, metadata = {}) => {
  logger.info(`File uploaded`, {
    filename,
    size,
    userId,
    category: 'upload',
    ...metadata
  });
};

logger.logAuth = (action, userId, success, metadata = {}) => {
  logger.info(`Authentication ${action}`, {
    action,
    userId,
    success,
    category: 'auth',
    ...metadata
  });
};

logger.logQueue = (jobId, action, metadata = {}) => {
  logger.info(`Queue ${action}`, {
    jobId,
    action,
    category: 'queue',
    ...metadata
  });
};

module.exports = logger;
