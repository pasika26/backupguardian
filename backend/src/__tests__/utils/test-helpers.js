/**
 * Test utilities and helpers for BackupGuardian tests
 */

/**
 * Create a mock Docker container info object
 */
const createMockContainer = (overrides = {}) => ({
  containerId: 'test-container-id',
  containerName: 'backup-guardian-test-123',
  connectionInfo: {
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    username: 'testuser',
    password: 'testpass'
  },
  ...overrides
});

/**
 * Create a mock backup validation result
 */
const createMockValidationResult = (overrides = {}) => ({
  testId: 'test-123',
  success: true,
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T10:05:00Z'),
  duration: 300000,
  stages: {
    containerCreation: { success: true, duration: 30000, error: null },
    restore: { success: true, duration: 120000, error: null, output: 'CREATE TABLE success' },
    validation: { success: true, duration: 60000, error: null, details: null },
    cleanup: { success: true, duration: 10000, error: null }
  },
  fileInfo: {
    path: '/path/to/backup.sql',
    type: 'sql',
    size: 1024
  },
  databaseInfo: {
    tableCount: 5,
    hasData: true,
    connectionInfo: createMockContainer().connectionInfo
  },
  errors: [],
  ...overrides
});

/**
 * Create a mock restore result
 */
const createMockRestoreResult = (overrides = {}) => ({
  success: true,
  output: 'CREATE TABLE\nINSERT 0 5\nCOMMIT',
  error: null,
  duration: 5000,
  fileType: '.sql',
  ...overrides
});

/**
 * Create a mock schema validation result
 */
const createMockSchemaResult = (overrides = {}) => ({
  success: true,
  tableCount: 5,
  tables: [
    { tablename: 'users', schemaname: 'public' },
    { tablename: 'posts', schemaname: 'public' }
  ],
  views: [{ viewname: 'user_posts', schemaname: 'public' }],
  indexes: [{ indexname: 'idx_users_email', tablename: 'users' }],
  constraints: [{ constraint_name: 'pk_users', table_name: 'users' }],
  functions: [{ function_name: 'get_user_posts', schema_name: 'public' }],
  sequences: [{ sequencename: 'users_id_seq', schemaname: 'public' }],
  schemas: [{ schema_name: 'public' }],
  comparison: null,
  duration: 2000,
  error: null,
  ...overrides
});

/**
 * Create a mock data validation result
 */
const createMockDataResult = (overrides = {}) => ({
  success: true,
  totalRows: 1500,
  tableStats: {
    users: { actual: 100, expected: 100, difference: 0, status: 'match' },
    posts: { actual: 500, expected: 500, difference: 0, status: 'match' },
    comments: { actual: 900, expected: 900, difference: 0, status: 'match' }
  },
  emptyTables: [],
  largeTables: ['comments'],
  dataIntegrityIssues: [],
  duration: 3000,
  error: null,
  ...overrides
});

/**
 * Create a mock database query result
 */
const createMockQueryResult = (rows, overrides = {}) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  fields: [],
  ...overrides
});

/**
 * Wait for a specified amount of time (for testing async operations)
 */
const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random test ID
 */
const generateTestId = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create a mock file stats object
 */
const createMockFileStats = (overrides = {}) => ({
  size: 1024,
  isFile: () => true,
  isDirectory: () => false,
  mtime: new Date(),
  ctime: new Date(),
  atime: new Date(),
  ...overrides
});

/**
 * Mock console methods for testing
 */
const mockConsole = () => {
  const originalConsole = { ...console };
  const mockMethods = {};
  
  ['log', 'info', 'warn', 'error'].forEach(method => {
    mockMethods[method] = jest.fn();
    console[method] = mockMethods[method];
  });
  
  return {
    mocks: mockMethods,
    restore: () => {
      Object.assign(console, originalConsole);
    }
  };
};

/**
 * Create a mock exec function for child_process
 */
const createMockExec = () => {
  const mockExec = jest.fn();
  
  // Helper to make exec return successful result
  mockExec.mockSuccess = (stdout = '', stderr = '') => {
    mockExec.mockImplementation((cmd, callback) => {
      callback(null, { stdout, stderr });
    });
    return mockExec;
  };
  
  // Helper to make exec return error
  mockExec.mockError = (error) => {
    mockExec.mockImplementation((cmd, callback) => {
      callback(error);
    });
    return mockExec;
  };
  
  // Helper to make exec return different results based on command
  mockExec.mockCommandMap = (commandMap) => {
    mockExec.mockImplementation((cmd, callback) => {
      for (const [pattern, result] of Object.entries(commandMap)) {
        if (cmd.includes(pattern)) {
          if (result.error) {
            callback(result.error);
          } else {
            callback(null, { stdout: result.stdout || '', stderr: result.stderr || '' });
          }
          return;
        }
      }
      callback(new Error(`Unmocked command: ${cmd}`));
    });
    return mockExec;
  };
  
  return mockExec;
};

module.exports = {
  createMockContainer,
  createMockValidationResult,
  createMockRestoreResult,
  createMockSchemaResult,
  createMockDataResult,
  createMockQueryResult,
  createMockFileStats,
  wait,
  generateTestId,
  mockConsole,
  createMockExec
};
