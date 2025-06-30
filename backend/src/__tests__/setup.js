// Jest setup file for global test configuration
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.QUEUE_REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'sqlite::memory:';

// Mock external dependencies
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock Bull queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn()
  }));
});

// Mock Docker operations
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn()
}));
