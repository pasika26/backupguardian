const { PostgreSQLDatabase } = require('../database');

/**
 * Legacy DockerRunner wrapper for backward compatibility
 * @deprecated Use DatabaseFactory.createDatabase('postgresql') instead
 */
class DockerRunner {
  constructor() {
    console.warn('DockerRunner is deprecated. Use DatabaseFactory.createDatabase("postgresql") instead.');
    this.database = new PostgreSQLDatabase();
  }

  async createContainer(testId) {
    return await this.database.createContainer(testId);
  }

  async waitForContainer(containerName, maxAttempts = 30) {
    return await this.database.waitForContainer(containerName, maxAttempts);
  }

  async removeContainer(containerName) {
    return await this.database.cleanup(containerName);
  }

  async getAvailablePort() {
    return await this.database.getAvailablePort();
  }

  async listTestContainers() {
    return await this.database.listTestContainers();
  }

  async cleanupAllContainers() {
    return await this.database.cleanupAllContainers();
  }
}

module.exports = DockerRunner;
