/**
 * Abstract base class for database implementations
 * Defines the common interface for all database types
 */
class BaseDatabase {
  constructor(config = {}) {
    if (this.constructor === BaseDatabase) {
      throw new Error('BaseDatabase is abstract and cannot be instantiated');
    }
    
    this.config = config;
    this.containerPrefix = 'backup-guardian-test';
    this.tempDir = require('path').join(__dirname, '../../temp');
  }

  /**
   * Create and start a database test container
   * @param {string} testId - Unique test identifier
   * @returns {Promise<{containerId: string, containerName: string, connectionInfo: object}>}
   * @abstract
   */
  async createContainer(testId) {
    throw new Error('createContainer() must be implemented by subclass');
  }

  /**
   * Restore a backup file to the database container
   * @param {string} backupFilePath - Path to the backup file
   * @param {object} connectionInfo - Database connection info
   * @param {string} containerName - Docker container name
   * @returns {Promise<{success: boolean, output: string, error?: string, duration: number, fileType: string}>}
   * @abstract
   */
  async restoreBackup(backupFilePath, connectionInfo, containerName) {
    throw new Error('restoreBackup() must be implemented by subclass');
  }

  /**
   * Validate data integrity of the restored database
   * @param {object} connectionInfo - Database connection info
   * @param {string} containerName - Docker container name
   * @param {object} options - Validation options
   * @returns {Promise<{success: boolean, tableCount: number, hasData: boolean, details: object, errors: Array}>}
   * @abstract
   */
  async validateData(connectionInfo, containerName, options = {}) {
    throw new Error('validateData() must be implemented by subclass');
  }

  /**
   * Validate schema of the restored database
   * @param {object} connectionInfo - Database connection info
   * @param {string} containerName - Docker container name
   * @param {object} originalSchema - Original schema to compare against
   * @returns {Promise<{success: boolean, details: object, errors: Array}>}
   * @abstract
   */
  async validateSchema(connectionInfo, containerName, originalSchema = null) {
    throw new Error('validateSchema() must be implemented by subclass');
  }

  /**
   * Clean up container and resources
   * @param {string} containerName - Docker container name
   * @returns {Promise<void>}
   * @abstract
   */
  async cleanup(containerName) {
    throw new Error('cleanup() must be implemented by subclass');
  }

  /**
   * Get connection information for the database
   * @param {string} testId - Unique test identifier
   * @returns {Promise<object>}
   * @abstract
   */
  async getConnectionInfo(testId) {
    throw new Error('getConnectionInfo() must be implemented by subclass');
  }

  /**
   * Wait for database container to be ready
   * @param {string} containerName - Docker container name
   * @param {number} maxAttempts - Maximum number of attempts
   * @returns {Promise<void>}
   * @abstract
   */
  async waitForContainer(containerName, maxAttempts = 30) {
    throw new Error('waitForContainer() must be implemented by subclass');
  }

  /**
   * Get the database type identifier
   * @returns {string}
   * @abstract
   */
  getDatabaseType() {
    throw new Error('getDatabaseType() must be implemented by subclass');
  }

  /**
   * Get supported file extensions for this database type
   * @returns {Array<string>}
   * @abstract
   */
  getSupportedExtensions() {
    throw new Error('getSupportedExtensions() must be implemented by subclass');
  }

  // Common utility methods that can be shared across implementations
  
  /**
   * Find an available port for the container
   * @returns {Promise<number>}
   */
  async getAvailablePort() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const basePort = this.config.basePort || 5433;
    const maxPort = basePort + 100;
    
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
   * Ensure temp directory exists
   * @protected
   */
  async ensureTempDir() {
    const fs = require('fs').promises;
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Copy backup file into Docker container
   * @protected
   */
  async copyFileToContainer(localPath, containerName, containerPath) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const command = `docker cp "${localPath}" ${containerName}:${containerPath}`;
      await execAsync(command);
      console.log(`Copied backup file to container: ${containerPath}`);
    } catch (error) {
      throw new Error(`Failed to copy backup file to container: ${error.message}`);
    }
  }

  /**
   * List all test containers for this database type
   * @returns {Promise<Array<string>>}
   */
  async listTestContainers() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
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
   * Clean up all test containers for this database type
   */
  async cleanupAllContainers() {
    const containers = await this.listTestContainers();
    console.log(`Cleaning up ${containers.length} ${this.getDatabaseType()} test containers`);
    
    for (const containerName of containers) {
      await this.cleanup(containerName);
    }
  }
}

module.exports = BaseDatabase;
