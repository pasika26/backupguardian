const { exec } = require('child_process');
const { promisify } = require('util');
const settingsService = require('./settings-service');

const execAsync = promisify(exec);

class DockerRunner {
  constructor() {
    this.containerPrefix = 'backup-guardian-test';
  }

  /**
   * Create and start a PostgreSQL test container
   * @param {string} testId - Unique test identifier
   * @returns {Promise<{containerId: string, connectionInfo: object}>}
   */
  async createContainer(testId) {
    const containerName = `${this.containerPrefix}-${testId}`;
    const dbPassword = 'testpass123';
    const dbName = 'testdb';
    const dbUser = 'testuser';
    const port = await this.getAvailablePort();

    try {
      // Pull PostgreSQL image if not available
      console.log('Pulling PostgreSQL image...');
      await execAsync('docker pull postgres:15-alpine');

      // Create and start container
      console.log(`Creating container: ${containerName}`);
      const createCommand = [
        'docker run -d',
        `--name ${containerName}`,
        `-p ${port}:5432`,
        `-e POSTGRES_DB=${dbName}`,
        `-e POSTGRES_USER=${dbUser}`,
        `-e POSTGRES_PASSWORD=${dbPassword}`,
        '--rm', // Auto-remove when stopped
        'postgres:15-alpine'
      ].join(' ');

      const { stdout: containerId } = await execAsync(createCommand);

      // Wait for container to be ready
      await this.waitForContainer(containerName);

      const connectionInfo = {
        host: 'localhost',
        port: port,
        database: dbName,
        username: dbUser,
        password: dbPassword
      };

      console.log(`Container ${containerName} is ready`);
      return {
        containerId: containerId.trim(),
        containerName,
        connectionInfo
      };
    } catch (error) {
      console.error(`Failed to create container ${containerName}:`, error.message);
      throw new Error(`Docker container creation failed: ${error.message}`);
    }
  }

  /**
   * Wait for PostgreSQL container to be ready
   * @param {string} containerName 
   */
  async waitForContainer(containerName, maxAttempts = null) {
    if (maxAttempts === null) {
      try {
        const timeoutMinutes = await settingsService.getDockerTimeout();
        maxAttempts = Math.floor((timeoutMinutes * 60) / 2); // 2 second intervals
      } catch (error) {
        console.warn('Failed to get Docker timeout setting, using default:', error);
        maxAttempts = 30; // 1 minute default
      }
    }
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { stdout } = await execAsync(
          `docker exec ${containerName} pg_isready -U testuser -d testdb`
        );
        if (stdout.includes('accepting connections')) {
          return;
        }
      } catch (error) {
        // Container not ready yet
      }
      
      console.log(`Waiting for container ${containerName} to be ready... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Container ${containerName} failed to become ready after ${maxAttempts} attempts`);
  }

  /**
   * Stop and remove a test container
   * @param {string} containerName 
   */
  async removeContainer(containerName) {
    try {
      console.log(`Stopping container: ${containerName}`);
      await execAsync(`docker stop ${containerName}`);
      console.log(`Container ${containerName} stopped and removed`);
    } catch (error) {
      console.error(`Failed to remove container ${containerName}:`, error.message);
      // Don't throw - cleanup should be best effort
    }
  }

  /**
   * Find an available port for the container
   * @returns {Promise<number>}
   */
  async getAvailablePort() {
    // Simple port range - in production, use a proper port finder
    const basePort = 5433;
    const maxPort = 5533;
    
    for (let port = basePort; port < maxPort; port++) {
      try {
        await execAsync(`netstat -an | grep ${port}`);
        // Port is in use, try next
      } catch (error) {
        // Port is available
        return port;
      }
    }
    
    throw new Error('No available ports found for test container');
  }

  /**
   * List all backup guardian test containers
   * @returns {Promise<Array>}
   */
  async listTestContainers() {
    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter name=${this.containerPrefix} --format "{{.Names}}"`
      );
      return stdout.trim().split('\n').filter(name => name);
    } catch (error) {
      console.error('Failed to list test containers:', error.message);
      return [];
    }
  }

  /**
   * Clean up all test containers (emergency cleanup)
   */
  async cleanupAllContainers() {
    const containers = await this.listTestContainers();
    console.log(`Cleaning up ${containers.length} test containers`);
    
    for (const containerName of containers) {
      await this.removeContainer(containerName);
    }
  }
}

module.exports = DockerRunner;
