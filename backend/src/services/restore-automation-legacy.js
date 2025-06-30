const { PostgreSQLDatabase } = require('../database');

/**
 * Legacy RestoreAutomation wrapper for backward compatibility
 * @deprecated Use DatabaseFactory.createDatabase('postgresql').restoreBackup() instead
 */
class RestoreAutomation {
  constructor() {
    console.warn('RestoreAutomation is deprecated. Use DatabaseFactory.createDatabase("postgresql").restoreBackup() instead.');
    this.database = new PostgreSQLDatabase();
  }

  async executeRestore(backupFilePath, connectionInfo, containerName) {
    return await this.database.restoreBackup(backupFilePath, connectionInfo, containerName);
  }

  async validateRestoredDatabase(connectionInfo, containerName) {
    const result = await this.database.validateData(connectionInfo, containerName);
    
    // Transform result to match legacy format
    return {
      tableCount: result.tableCount,
      hasData: result.hasData,
      errors: result.errors
    };
  }

  async ensureTempDir() {
    return await this.database.ensureTempDir();
  }

  async cleanupTempFile(filePath) {
    const fs = require('fs').promises;
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to cleanup temp file ${filePath}:`, error.message);
    }
  }
}

module.exports = RestoreAutomation;
