const BackupValidator = require('./backup-validator');
const DockerRunner = require('./docker-runner');
const RestoreAutomation = require('./restore-automation');
const SchemaValidator = require('./schema-validator');
const DataValidator = require('./data-validator');
const SamplingValidator = require('./sampling-validator');
const fs = require('fs').promises;

// Mock all dependencies
jest.mock('./docker-runner', () => {
  return jest.fn().mockImplementation(() => ({
    createContainer: jest.fn(),
    removeContainer: jest.fn(),
    cleanupAllContainers: jest.fn()
  }));
});

jest.mock('./restore-automation', () => {
  return jest.fn().mockImplementation(() => ({
    executeRestore: jest.fn(),
    validateRestoredDatabase: jest.fn()
  }));
});

jest.mock('./schema-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validateTableCount: jest.fn()
  }));
});

jest.mock('./data-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validateRowCounts: jest.fn()
  }));
});

jest.mock('./sampling-validator', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('fs', () => ({ promises: { stat: jest.fn() } }));

describe('BackupValidator', () => {
  let backupValidator;
  let mockDockerRunner;
  let mockRestoreAutomation;
  let mockSchemaValidator;
  let mockDataValidator;
  let mockFs;

  beforeEach(() => {
    backupValidator = new BackupValidator();
    mockDockerRunner = DockerRunner.prototype;
    mockRestoreAutomation = RestoreAutomation.prototype;
    mockSchemaValidator = SchemaValidator.prototype;
    mockDataValidator = DataValidator.prototype;
    mockFs = fs;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize all validators', () => {
      expect(backupValidator.dockerRunner).toBeDefined();
      expect(backupValidator.restoreAutomation).toBeDefined();
      expect(backupValidator.schemaValidator).toBeDefined();
      expect(backupValidator.dataValidator).toBeDefined();
      expect(backupValidator.samplingValidator).toBeDefined();
    });
  });

  describe('validateBackup', () => {
    const mockBackupPath = '/path/to/backup.sql';
    const mockContainer = {
      containerId: 'test-container-id',
      containerName: 'test-container',
      connectionInfo: {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass'
      }
    };

    beforeEach(() => {
      mockFs.stat.mockResolvedValue({ size: 1024 });
      mockDockerRunner.createContainer.mockResolvedValue(mockContainer);
      mockDockerRunner.removeContainer.mockResolvedValue();
      mockRestoreAutomation.executeRestore.mockResolvedValue({
        success: true,
        output: 'CREATE TABLE success',
        duration: 1000
      });
      mockRestoreAutomation.validateRestoredDatabase.mockResolvedValue({
        tableCount: 5,
        hasData: true,
        errors: []
      });
    });

    test('should complete successful validation', async () => {
      const result = await backupValidator.validateBackup(mockBackupPath);

      expect(result.success).toBe(true);
      expect(result.testId).toBeDefined();
      expect(result.stages.containerCreation.success).toBe(true);
      expect(result.stages.restore.success).toBe(true);
      expect(result.stages.validation.success).toBe(true);
      expect(result.stages.cleanup.success).toBe(true);
      expect(result.databaseInfo.tableCount).toBe(5);
      expect(result.databaseInfo.hasData).toBe(true);
      expect(result.fileInfo.size).toBe(1024);
    });

    test('should handle container creation failure', async () => {
      mockDockerRunner.createContainer.mockRejectedValue(new Error('Docker not available'));

      const result = await backupValidator.validateBackup(mockBackupPath);

      expect(result.success).toBe(false);
      expect(result.stages.containerCreation.success).toBe(false);
      expect(result.stages.containerCreation.error).toBe('Docker not available');
      expect(result.errors).toContain('Container creation failed: Docker not available');
    });

    test('should handle restore failure', async () => {
      mockRestoreAutomation.executeRestore.mockResolvedValue({
        success: false,
        output: 'ERROR: relation does not exist',
        error: 'Restore failed',
        duration: 500
      });

      const result = await backupValidator.validateBackup(mockBackupPath);

      expect(result.success).toBe(false);
      expect(result.stages.restore.success).toBe(false);
      expect(result.stages.restore.error).toBe('Restore failed');
      expect(result.errors).toContain('Restore failed: Restore failed');
    });

    test('should handle validation failure', async () => {
      mockRestoreAutomation.validateRestoredDatabase.mockResolvedValue({
        tableCount: 0,
        hasData: false,
        errors: ['No tables found after restore']
      });

      const result = await backupValidator.validateBackup(mockBackupPath);

      expect(result.success).toBe(false);
      expect(result.stages.validation.success).toBe(false);
      expect(result.errors).toContain('No tables found after restore');
    });

    test('should perform schema validation when enabled', async () => {
      mockSchemaValidator.validateTableCount.mockResolvedValue({
        success: true,
        tableCount: 5,
        tables: ['users', 'posts'],
        views: ['user_posts_view'],
        indexes: ['idx_users_email'],
        constraints: ['pk_users'],
        functions: ['get_user_posts'],
        sequences: ['users_id_seq'],
        schemas: ['public']
      });

      const result = await backupValidator.validateBackup(mockBackupPath, {
        enableSchemaValidation: true,
        originalSchema: { tableCount: 5 }
      });

      expect(result.success).toBe(true);
      expect(result.databaseInfo.schemaDetails).toBeDefined();
      expect(result.databaseInfo.schemaDetails.tables).toEqual(['users', 'posts']);
      expect(mockSchemaValidator.validateTableCount).toHaveBeenCalled();
    });

    test('should perform data validation when enabled', async () => {
      mockDataValidator.validateRowCounts.mockResolvedValue({
        success: true,
        totalRows: 1000,
        tableStats: { users: 100, posts: 900 },
        emptyTables: [],
        largeTables: ['posts'],
        dataIntegrityIssues: []
      });

      const result = await backupValidator.validateBackup(mockBackupPath, {
        enableDataValidation: true,
        expectedRowCounts: { users: 100, posts: 900 }
      });

      expect(result.success).toBe(true);
      expect(result.databaseInfo.dataDetails).toBeDefined();
      expect(result.databaseInfo.dataDetails.totalRows).toBe(1000);
      expect(mockDataValidator.validateRowCounts).toHaveBeenCalled();
    });

    test('should handle cleanup failure gracefully', async () => {
      mockDockerRunner.removeContainer.mockRejectedValue(new Error('Cleanup failed'));

      const result = await backupValidator.validateBackup(mockBackupPath);

      expect(result.success).toBe(true); // Overall success not affected by cleanup failure
      expect(result.stages.cleanup.success).toBe(false);
      expect(result.stages.cleanup.error).toBe('Cleanup failed');
    });
  });

  describe('getFileType', () => {
    test('should identify SQL files', () => {
      expect(backupValidator.getFileType('backup.sql')).toBe('sql');
      expect(backupValidator.getFileType('backup.SQL')).toBe('sql');
    });

    test('should identify dump files', () => {
      expect(backupValidator.getFileType('backup.dump')).toBe('dump');
      expect(backupValidator.getFileType('backup.backup')).toBe('backup');
    });

    test('should handle unknown file types', () => {
      expect(backupValidator.getFileType('backup.txt')).toBe('unknown');
      expect(backupValidator.getFileType('backup')).toBe('unknown');
    });
  });

  describe('validateMultipleBackups', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({ size: 1024 });
      mockDockerRunner.createContainer.mockResolvedValue({
        containerId: 'test-container-id',
        containerName: 'test-container',
        connectionInfo: {}
      });
      mockDockerRunner.removeContainer.mockResolvedValue();
      mockRestoreAutomation.executeRestore.mockResolvedValue({
        success: true,
        output: 'Success',
        duration: 1000
      });
      mockRestoreAutomation.validateRestoredDatabase.mockResolvedValue({
        tableCount: 5,
        hasData: true,
        errors: []
      });
    });

    test('should validate multiple backup files', async () => {
      const filePaths = ['/path/to/backup1.sql', '/path/to/backup2.sql'];
      
      const results = await backupValidator.validateMultipleBackups(filePaths);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    test('should handle individual validation failures', async () => {
      const filePaths = ['/path/to/backup1.sql', '/path/to/backup2.sql'];
      mockDockerRunner.createContainer
        .mockResolvedValueOnce({ containerId: 'test-1', containerName: 'test-1', connectionInfo: {} })
        .mockRejectedValueOnce(new Error('Container creation failed'));

      const results = await backupValidator.validateMultipleBackups(filePaths);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    test('should calculate validation statistics', () => {
      const results = [
        { success: true, duration: 1000, fileInfo: { type: 'sql' } },
        { success: false, duration: 500, fileInfo: { type: 'sql' } },
        { success: true, duration: 1500, fileInfo: { type: 'dump' } }
      ];

      const summary = backupValidator.getValidationSummary(results);

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.successRate).toBe(67);
      expect(summary.avgDuration).toBe(1000);
      expect(summary.fileTypes).toEqual({ sql: 2, dump: 1 });
    });

    test('should handle empty results', () => {
      const summary = backupValidator.getValidationSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.successful).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.avgDuration).toBe(0);
    });
  });

  describe('emergencyCleanup', () => {
    test('should call docker cleanup', async () => {
      await backupValidator.emergencyCleanup();

      expect(mockDockerRunner.cleanupAllContainers).toHaveBeenCalled();
    });
  });
});
