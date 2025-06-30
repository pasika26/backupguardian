const DataValidator = require('./data-validator');

// Mock pg client
const mockClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('pg', () => ({
  Client: jest.fn(() => mockClient)
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  logError: jest.fn()
}));

describe('DataValidator', () => {
  let dataValidator;

  beforeEach(() => {
    dataValidator = new DataValidator();
    jest.clearAllMocks();
  });

  describe('validateRowCounts', () => {
    const mockConnectionInfo = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass'
    };

    const mockExpectedCounts = {
      users: 100,
      posts: 500,
      comments: 1000
    };

    beforeEach(() => {
      mockClient.connect.mockResolvedValue();
      mockClient.end.mockResolvedValue();
    });

    test('should validate row counts successfully', async () => {
      // Mock table list query
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'users' },
            { table_name: 'posts' },
            { table_name: 'comments' }
          ]
        })
        // Mock individual table count queries
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '500' }] }) // posts
        .mockResolvedValueOnce({ rows: [{ count: '1000' }] }); // comments

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        mockExpectedCounts
      );

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(1600);
      expect(result.tableStats).toHaveLength(3);
      expect(result.tableStats[0].table).toBe('users');
      expect(result.tableStats[0].rowCount).toBe(100);
      expect(result.tableStats[1].table).toBe('posts');
      expect(result.tableStats[1].rowCount).toBe(500);
      expect(result.tableStats[2].table).toBe('comments');
      expect(result.tableStats[2].rowCount).toBe(1000);
      expect(result.emptyTables).toHaveLength(0);
    });

    test('should detect row count mismatches', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'users' },
            { table_name: 'posts' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '95' }] }) // users - 5 less
        .mockResolvedValueOnce({ rows: [{ count: '600' }] }); // posts - 100 more

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        { users: 100, posts: 500 }
      );

      expect(result.success).toBe(true); // Success based on data integrity, not count comparison
      expect(result.comparison).toBeDefined();
      expect(result.comparison.identical).toBe(false);
      expect(result.comparison.differences).toHaveLength(2);
    });

    test('should identify empty tables', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'users' },
            { table_name: 'posts' },
            { table_name: 'logs' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '500' }] }) // posts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // logs - empty

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        { users: 100, posts: 500, logs: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.emptyTables).toContain('public.logs');
    });

    test('should identify large tables', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'users' },
            { table_name: 'analytics' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1000' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '2000000' }] }); // analytics - large

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        { users: 1000, analytics: 2000000 },
        { largeTableThreshold: 1000000 }
      );

      expect(result.success).toBe(true);
      expect(result.largeTables).toHaveLength(1);
      expect(result.largeTables[0].table).toBe('public.analytics');
    });

    test('should handle database connection failure', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        mockExpectedCounts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.totalRows).toBe(0);
    });

    test('should handle query failure', async () => {
      mockClient.connect.mockResolvedValue();
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const result = await dataValidator.validateRowCounts(
        mockConnectionInfo,
        mockExpectedCounts
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });

    test('should validate without expected counts', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { table_name: 'users' },
            { table_name: 'posts' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '500' }] }); // posts

      const result = await dataValidator.validateRowCounts(mockConnectionInfo);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(600);
      expect(result.tableStats).toHaveLength(2);
      expect(result.comparison).toBeNull();
    });
  });

  describe('generateReport', () => {
    test('should generate comprehensive data report', () => {
      const validationResult = {
        success: true,
        totalRows: 1600,
        tableStats: [
          { table: 'users', rowCount: 100 },
          { table: 'posts', rowCount: 500 },
          { table: 'comments', rowCount: 1000 }
        ],
        emptyTables: [],
        largeTables: [{ table: 'comments', rowCount: 1000 }],
        dataIntegrityIssues: [],
        duration: 2500
      };

      const report = dataValidator.generateReport(validationResult);

      expect(report).toContain('Data validation completed successfully');
      expect(report).toContain('Total Rows**: 1,600');
      expect(report).toContain('Duration**: 2500ms');
    });

    test('should include data integrity issues in report', () => {
      const validationResult = {
        success: false,
        totalRows: 1000,
        tableStats: [],
        emptyTables: ['logs'],
        largeTables: [],
        dataIntegrityIssues: [
          {
            type: 'unexpected_nulls',
            table: 'users',
            count: 5,
            severity: 'error'
          }
        ],
        duration: 3000
      };

      const report = dataValidator.generateReport(validationResult);

      expect(report).toContain('Data validation completed with 1 issues');
      expect(report).toContain('logs');
      expect(report).toContain('unexpected_nulls');
    });

    test('should handle failed validation report', () => {
      const validationResult = {
        success: false,
        error: 'Database connection failed',
        totalRows: 0,
        tableStats: [],
        emptyTables: [],
        largeTables: [],
        dataIntegrityIssues: [],
        duration: 1000
      };

      const report = dataValidator.generateReport(validationResult);

      expect(report).toContain('Data validation completed with 0 issues');
      expect(report).toContain('Duration**: 1000ms');
    });
  });
});
