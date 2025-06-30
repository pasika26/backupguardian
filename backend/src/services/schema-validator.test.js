const SchemaValidator = require('./schema-validator');

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

describe('SchemaValidator', () => {
  let schemaValidator;

  beforeEach(() => {
    schemaValidator = new SchemaValidator();
    jest.clearAllMocks();
  });

  describe('validateTableCount', () => {
    const mockContainerInfo = {
      containerName: 'test-container',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass'
    };

    beforeEach(() => {
      mockClient.connect.mockResolvedValue();
      mockClient.end.mockResolvedValue();
    });

    test('should validate schema successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ tablename: 'users' }, { tablename: 'posts' }] }) // tables
        .mockResolvedValueOnce({ rows: [{ viewname: 'user_posts' }] }) // views
        .mockResolvedValueOnce({ rows: [{ indexname: 'idx_users_email' }] }) // indexes
        .mockResolvedValueOnce({ rows: [{ constraint_name: 'pk_users' }] }) // constraints
        .mockResolvedValueOnce({ rows: [{ function_name: 'get_user_posts' }] }) // functions
        .mockResolvedValueOnce({ rows: [{ sequencename: 'users_id_seq' }] }) // sequences
        .mockResolvedValueOnce({ rows: [{ schema_name: 'public' }] }); // schemas

      const result = await schemaValidator.validateTableCount(mockContainerInfo);

      expect(result.success).toBe(true);
      expect(result.tableCount).toBe(2);
      expect(result.tables).toHaveLength(2);
      expect(result.views).toHaveLength(1);
      expect(result.indexes).toHaveLength(1);
      expect(result.constraints).toHaveLength(1);
      expect(result.functions).toHaveLength(1);
      expect(result.sequences).toHaveLength(1);
      expect(result.schemas).toHaveLength(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should handle database connection failure', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await schemaValidator.validateTableCount(mockContainerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.tableCount).toBe(0);
    });

    test('should handle query failure', async () => {
      mockClient.connect.mockResolvedValue();
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const result = await schemaValidator.validateTableCount(mockContainerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });

    test('should compare with original schema when provided', async () => {
      const originalSchema = {
        tables: [{ tablename: 'users' }, { tablename: 'posts' }],
        views: [{ viewname: 'user_posts' }],
        indexes: [{ indexname: 'idx_users_email' }],
        constraints: [{ constraint_name: 'pk_users' }],
        functions: [{ function_name: 'get_user_posts' }],
        sequences: [{ sequencename: 'users_id_seq' }],
        schemas: [{ schema_name: 'public' }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ tablename: 'users' }] }) // missing 'posts' table
        .mockResolvedValueOnce({ rows: originalSchema.views })
        .mockResolvedValueOnce({ rows: originalSchema.indexes })
        .mockResolvedValueOnce({ rows: originalSchema.constraints })
        .mockResolvedValueOnce({ rows: originalSchema.functions })
        .mockResolvedValueOnce({ rows: originalSchema.sequences })
        .mockResolvedValueOnce({ rows: originalSchema.schemas });

      const result = await schemaValidator.validateTableCount(mockContainerInfo, originalSchema);

      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.identical).toBe(false);
      expect(result.comparison.differences.tables.missing).toContain('posts');
      expect(result.comparison.summary.totalDifferences).toBeGreaterThan(0);
      expect(result.comparison.summary.criticalIssues).toBeGreaterThan(0);
    });
  });

  describe('compareSchemas', () => {
    test('should identify identical schemas', () => {
      const schema1 = {
        tables: [{ tablename: 'users' }],
        views: [],
        indexes: [],
        constraints: [],
        functions: [],
        sequences: [],
        schemas: []
      };

      const schema2 = {
        tables: [{ tablename: 'users' }],
        views: [],
        indexes: [],
        constraints: [],
        functions: [],
        sequences: [],
        schemas: []
      };

      const comparison = schemaValidator.compareSchemas(schema1, schema2);

      expect(comparison.identical).toBe(true);
      expect(comparison.summary.totalDifferences).toBe(0);
    });

    test('should identify missing tables', () => {
      const currentSchema = {
        tables: [{ tablename: 'users' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const originalSchema = {
        tables: [{ tablename: 'users' }, { tablename: 'posts' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const comparison = schemaValidator.compareSchemas(currentSchema, originalSchema);

      expect(comparison.identical).toBe(false);
      expect(comparison.differences.tables.missing).toContain('posts');
      expect(comparison.summary.criticalIssues).toBe(1);
    });

    test('should identify extra tables', () => {
      const currentSchema = {
        tables: [{ tablename: 'users' }, { tablename: 'posts' }, { tablename: 'comments' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const originalSchema = {
        tables: [{ tablename: 'users' }, { tablename: 'posts' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const comparison = schemaValidator.compareSchemas(currentSchema, originalSchema);

      expect(comparison.identical).toBe(false);
      expect(comparison.differences.tables.extra).toContain('comments');
      expect(comparison.summary.warnings).toBe(1);
    });

    test('should identify modified tables', () => {
      const currentSchema = {
        tables: [{ tablename: 'users', tableowner: 'newowner' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const originalSchema = {
        tables: [{ tablename: 'users', tableowner: 'oldowner' }],
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: []
      };

      const comparison = schemaValidator.compareSchemas(currentSchema, originalSchema);

      expect(comparison.identical).toBe(false);
      expect(comparison.differences.tables.modified).toHaveLength(1);
      expect(comparison.differences.tables.modified[0].name).toBe('users');
      expect(comparison.summary.warnings).toBe(1);
    });
  });

  describe('compareLists', () => {
    test('should compare lists correctly', () => {
      const currentList = [
        { name: 'item1', value: 'a' },
        { name: 'item2', value: 'b' },
        { name: 'item3', value: 'c_modified' }
      ];

      const originalList = [
        { name: 'item1', value: 'a' },
        { name: 'item3', value: 'c' },
        { name: 'item4', value: 'd' }
      ];

      const result = { missing: [], extra: [], modified: [] };
      schemaValidator.compareLists(currentList, originalList, 'name', result);

      expect(result.missing).toContain('item4');
      expect(result.extra).toContain('item2');
      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].name).toBe('item3');
    });
  });

  describe('generateReport', () => {
    test('should generate report for successful validation', () => {
      const validationResult = {
        success: true,
        tableCount: 5,
        views: [1, 2],
        indexes: [1, 2, 3],
        constraints: [1],
        functions: [],
        sequences: [1],
        schemas: [1],
        duration: 1500,
        comparison: null
      };

      const report = schemaValidator.generateReport(validationResult);

      expect(report).toContain('Schema validation completed successfully');
      expect(report).toContain('Tables**: 5');
      expect(report).toContain('Views**: 2');
      expect(report).toContain('Duration**: 1500ms');
    });

    test('should generate report for failed validation', () => {
      const validationResult = {
        success: false,
        error: 'Connection timeout',
        duration: 5000
      };

      const report = schemaValidator.generateReport(validationResult);

      expect(report).toContain('Schema validation failed');
      expect(report).toContain('Connection timeout');
      expect(report).toContain('Duration**: 5000ms');
    });

    test('should include comparison details in report', () => {
      const validationResult = {
        success: true,
        tableCount: 2,
        views: [], indexes: [], constraints: [], functions: [], sequences: [], schemas: [],
        duration: 1000,
        comparison: {
          identical: false,
          summary: { totalDifferences: 2, criticalIssues: 1, warnings: 1 },
          differences: {
            tables: { missing: ['posts'], extra: ['comments'], modified: [] },
            views: { missing: [], extra: [], modified: [] },
            indexes: { missing: [], extra: [], modified: [] },
            constraints: { missing: [], extra: [], modified: [] },
            functions: { missing: [], extra: [], modified: [] },
            sequences: { missing: [], extra: [], modified: [] },
            schemas: { missing: [], extra: [], modified: [] }
          }
        }
      };

      const report = schemaValidator.generateReport(validationResult);

      expect(report).toContain('2 differences found');
      expect(report).toContain('Critical Issues: 1');
      expect(report).toContain('Missing**: posts');
      expect(report).toContain('Extra**: comments');
    });
  });
});
