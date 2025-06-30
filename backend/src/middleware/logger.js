const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * HTTP request logging middleware using Morgan
 */

// Custom token to get user ID from request
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Custom token for response time in seconds
morgan.token('response-time-sec', (req, res) => {
  const responseTime = morgan['response-time'](req, res);
  return responseTime ? (parseFloat(responseTime) / 1000).toFixed(3) + 's' : '-';
});

// Define custom format
const morganFormat = ':remote-addr - :user-id [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-sec';

// Create Morgan middleware that integrates with Winston
const morganMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Remove trailing newline and log as HTTP level
      logger.http(message.trim());
    }
  },
  // Skip logging for health checks and static assets
  skip: (req, res) => {
    return req.url === '/health' || 
           req.url.startsWith('/static') ||
           (res.statusCode < 400 && process.env.NODE_ENV === 'production');
  }
});

// Enhanced request logger with additional context
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Add request ID for tracking
  req.requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  // Log request start
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    userId: req.user?.id,
    category: 'request'
  });
  
  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log response completion
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      category: 'response'
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = {
  morganMiddleware,
  requestLogger
};
