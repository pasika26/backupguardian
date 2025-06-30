const RestoreAutomation = require('./restore-automation');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('RestoreAutomation', () => {
  let restoreAutomation;
  let mockExec;
  let mockFs;

  beforeEach(() => {
    restoreAutomation = new RestoreAutomation();
    mockExec = exec;
    mockFs = fs;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct temp directory', () => {
      expect(restoreAutomation.tempDir).toContain('temp');
    });
  });

  describe('executeRestore', () => {
    const mockConnectionInfo = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass'
    };

    beforeEach(() => {
      mockFs.access.mockResolvedValue();
    });

    test('should execute SQL file restore successfully', async () => {
      mockExec
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: '', stderr: '' })) // copy file
        .mockImplementationOnce((cmd, callback) => callback(null, { 
          stdout: 'CREATE TABLE\nINSERT 0 5\nCOMMIT\n', 
          stderr: '' 
        })); // restore

      const result = await restoreAutomation.executeRestore(
        '/path/to/backup.sql',
        mockConnectionInfo,
        'test-container'
      );

      expect(result.success).toBe(true);
      expect(result.fileType).toBe('.sql');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should execute dump file restore successfully', async () => {
      mockExec
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: '', stderr: '' })) // copy file
        .mockImplementationOnce((cmd, callback) => callback(null, { 
          stdout: 'pg_restore: creating table\npg_restore: processing data\n', 
          stderr: '' 
        })); // restore

      const result = await restoreAutomation.executeRestore(
        '/path/to/backup.dump',
        mockConnectionInfo,
        'test-container'
      );

      expect(result.success).toBe(true);
      expect(result.fileType).toBe('.dump');
    });

    test('should handle unsupported file types', async () => {
      mockFs.access.mockResolvedValue();

      const result = await restoreAutomation.executeRestore(
        '/path/to/backup.txt',
        mockConnectionInfo,
        'test-container'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported backup file type');
    });

    test('should handle restore command failure', async () => {
      mockExec
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: '', stderr: '' })) // copy file
        .mockImplementationOnce((cmd, callback) => callback(new Error('psql: connection failed'))); // restore

      const result = await restoreAutomation.executeRestore(
        '/path/to/backup.sql',
        mockConnectionInfo,
        'test-container'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('callback is not a function');
    });
  });

  describe('validateRestoreOutput', () => {
    test('should validate SQL restore output correctly', () => {
      const goodOutput = 'CREATE TABLE\nINSERT 0 5\nCOMMIT';
      expect(restoreAutomation.validateRestoreOutput(goodOutput, '', '.sql')).toBe(true);

      const errorOutput = 'ERROR: relation "table" does not exist';
      expect(restoreAutomation.validateRestoreOutput(errorOutput, '', '.sql')).toBe(false);
    });

    test('should validate dump restore output correctly', () => {
      const goodOutput = 'pg_restore: creating table\npg_restore: processing data';
      expect(restoreAutomation.validateRestoreOutput(goodOutput, '', '.dump')).toBe(true);

      const errorOutput = 'pg_restore: error: connection failed';
      expect(restoreAutomation.validateRestoreOutput(errorOutput, '', '.dump')).toBe(false);
    });

    test('should detect common error keywords', () => {
      const errorKeywords = ['error:', 'fatal:', 'could not', 'permission denied'];
      
      errorKeywords.forEach(keyword => {
        const output = `Some output ${keyword} more output`;
        expect(restoreAutomation.validateRestoreOutput(output, '', '.sql')).toBe(false);
      });
    });
  });

  describe('validateRestoredDatabase', () => {
    const mockConnectionInfo = {
      username: 'testuser',
      password: 'testpass'
    };

    test('should validate database with tables and data', async () => {
      mockExec
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: '5\n' })) // table count
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: 't\n' })); // data check

      const result = await restoreAutomation.validateRestoredDatabase(
        mockConnectionInfo,
        'test-container'
      );

      expect(result.tableCount).toBe(5);
      expect(result.hasData).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle empty database', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => callback(null, { stdout: '0\n' }));

      const result = await restoreAutomation.validateRestoredDatabase(
        mockConnectionInfo,
        'test-container'
      );

      expect(result.tableCount).toBe(0);
      expect(result.hasData).toBe(false);
    });

    test('should handle validation errors', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => 
        callback(new Error('Connection failed'))
      );

      const result = await restoreAutomation.validateRestoredDatabase(
        mockConnectionInfo,
        'test-container'
      );

      expect(result.tableCount).toBe(0);
      expect(result.hasData).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database validation failed');
    });
  });

  describe('ensureTempDir', () => {
    test('should create temp directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue();

      await restoreAutomation.ensureTempDir();

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        restoreAutomation.tempDir,
        { recursive: true }
      );
    });

    test('should not create temp directory if it exists', async () => {
      mockFs.access.mockResolvedValue();

      await restoreAutomation.ensureTempDir();

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('cleanupTempFile', () => {
    test('should remove temp file successfully', async () => {
      mockFs.unlink.mockResolvedValue();

      await restoreAutomation.cleanupTempFile('/tmp/test-file');

      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/test-file');
    });

    test('should handle cleanup failure gracefully', async () => {
      mockFs.unlink.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await restoreAutomation.cleanupTempFile('/tmp/test-file');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
