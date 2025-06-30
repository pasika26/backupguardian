const DockerRunner = require('./docker-runner');
const { exec } = require('child_process');

// Mock child_process
jest.mock('child_process');

describe('DockerRunner', () => {
  let dockerRunner;
  let mockExec;

  beforeEach(() => {
    dockerRunner = new DockerRunner();
    mockExec = require('child_process').exec;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct container prefix', () => {
      expect(dockerRunner.containerPrefix).toBe('backup-guardian-test');
    });
  });

  describe('createContainer', () => {
    test('should create container with valid parameters', async () => {
      const testId = 'test-123';
      mockExec
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: '' })) // pull
        .mockImplementationOnce((cmd, callback) => callback(null, { stdout: 'container-id-123\n' })) // create
        .mockImplementation((cmd, callback) => {
          if (cmd.includes('pg_isready')) {
            callback(null, { stdout: 'testdb:5432 - accepting connections' });
          } else if (cmd.includes('netstat')) {
            callback(new Error('port available')); // Port not in use
          }
        });

      const result = await dockerRunner.createContainer(testId);

      expect(result).toEqual({
        containerId: 'container-id-123',
        containerName: `backup-guardian-test-${testId}`,
        connectionInfo: {
          host: 'localhost',
          port: expect.any(Number),
          database: 'testdb',
          username: 'testuser',
          password: expect.any(String)
        }
      });
    });

    test('should handle docker pull failure', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => 
        callback(new Error('Docker pull failed'))
      );

      await expect(dockerRunner.createContainer('test-123'))
        .rejects.toThrow('Docker container creation failed');
    });
  });

  describe('waitForContainer', () => {
    test('should wait for container to be ready', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd.includes('pg_isready')) {
          callback(null, { stdout: 'testdb:5432 - accepting connections' });
        }
      });

      await expect(dockerRunner.waitForContainer('test-container'))
        .resolves.toBeUndefined();
    });

    test('should timeout after max attempts', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('not ready'));
      });

      await expect(dockerRunner.waitForContainer('test-container', 2))
        .rejects.toThrow('failed to become ready after 2 attempts');
    });
  });

  describe('removeContainer', () => {
    test('should remove container successfully', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => callback(null, { stdout: '' }));

      await expect(dockerRunner.removeContainer('test-container'))
        .resolves.toBeUndefined();
      
      expect(mockExec).toHaveBeenCalledWith('docker stop test-container', expect.any(Function));
    });

    test('should handle removal failure gracefully', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => 
        callback(new Error('Container not found'))
      );

      // Should not throw
      await expect(dockerRunner.removeContainer('test-container'))
        .resolves.toBeUndefined();
    });
  });

  describe('getAvailablePort', () => {
    test('should find available port', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd.includes('netstat')) {
          callback(new Error('port available')); // Port not in use
        }
      });

      const port = await dockerRunner.getAvailablePort();
      expect(port).toBeGreaterThanOrEqual(5433);
    });

    test('should throw when no ports available', async () => {
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd.includes('netstat')) {
          callback(null, { stdout: 'port in use' });
        }
      });

      await expect(dockerRunner.getAvailablePort())
        .rejects.toThrow('No available ports found');
    });
  });

  describe('listTestContainers', () => {
    test('should list test containers', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => 
        callback(null, { stdout: 'backup-guardian-test-1\nbackup-guardian-test-2\n' })
      );

      const containers = await dockerRunner.listTestContainers();
      expect(containers).toEqual(['backup-guardian-test-1', 'backup-guardian-test-2']);
    });

    test('should handle listing failure', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => 
        callback(new Error('Docker not available'))
      );

      const containers = await dockerRunner.listTestContainers();
      expect(containers).toEqual([]);
    });
  });

  describe('cleanupAllContainers', () => {
    test('should cleanup all test containers', async () => {
      mockExec
        .mockImplementationOnce((cmd, callback) => 
          callback(null, { stdout: 'backup-guardian-test-1\nbackup-guardian-test-2\n' })
        )
        .mockImplementation((cmd, callback) => callback(null, { stdout: '' }));

      await dockerRunner.cleanupAllContainers();
      
      expect(mockExec).toHaveBeenCalledTimes(3); // list + 2 stops
    });
  });
});
