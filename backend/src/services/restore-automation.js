const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class RestoreAutomation {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
  }

  /**
   * Restore a backup file to a PostgreSQL container
   * @param {string} backupFilePath - Path to the backup file
   * @param {object} connectionInfo - Database connection info
   * @param {string} containerName - Docker container name
   * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
   */
  async executeRestore(backupFilePath, connectionInfo, containerName) {
    const startTime = Date.now();
    
    try {
      // Ensure temp directory exists
      await this.ensureTempDir();
      
      // Determine backup file type and restoration method
      const fileExtension = path.extname(backupFilePath).toLowerCase();
      const restoreResult = await this.performRestore(
        backupFilePath,
        fileExtension,
        connectionInfo,
        containerName
      );
      
      const duration = Date.now() - startTime;
      
      return {
        success: restoreResult.success,
        output: restoreResult.output,
        error: restoreResult.error,
        duration,
        fileType: fileExtension
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: error.message,
        duration,
        fileType: path.extname(backupFilePath).toLowerCase()
      };
    }
  }

  /**
   * Perform the actual restore based on file type
   * @private
   */
  async performRestore(backupFilePath, fileExtension, connectionInfo, containerName) {
    const { host, port, database, username, password } = connectionInfo;
    
    // Copy backup file into container
    const containerBackupPath = '/tmp/backup_file';
    await this.copyFileToContainer(backupFilePath, containerName, containerBackupPath);
    
    let command;
    let expectedOutput = '';
    
    switch (fileExtension) {
      case '.sql':
        // Plain SQL file - use psql
        command = [
          'docker exec',
          containerName,
          'psql',
          `-h ${host}`,
          `-p 5432`, // Internal container port
          `-U ${username}`,
          `-d ${database}`,
          `-f ${containerBackupPath}`,
          '-v ON_ERROR_STOP=1' // Stop on first error
        ].join(' ');
        expectedOutput = 'SQL commands executed';
        break;
        
      case '.dump':
      case '.backup':
        // Custom format dump - use pg_restore
        command = [
          'docker exec',
          containerName,
          'pg_restore',
          '-h localhost',
          '-p 5432',
          `-U ${username}`,
          `-d ${database}`,
          '--verbose',
          '--clean', // Clean before restore
          '--if-exists', // Don't error if objects don't exist
          '--no-owner', // Don't set ownership
          '--no-privileges', // Don't set privileges
          containerBackupPath
        ].join(' ');
        expectedOutput = 'restore completed';
        break;
        
      default:
        throw new Error(`Unsupported backup file type: ${fileExtension}`);
    }
    
    // Set password environment variable for the container
    const envCommand = `docker exec -e PGPASSWORD=${password} ${containerName.split(' ').pop()}`;
    command = command.replace(`docker exec ${containerName}`, envCommand);
    
    try {
      console.log(`Executing restore command: ${command.replace(password, '***')}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 minute timeout
      
      const output = stdout + stderr;
      const success = this.validateRestoreOutput(output, expectedOutput, fileExtension);
      
      return {
        success,
        output,
        error: success ? null : 'Restore completed but validation failed'
      };
      
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message + (error.stderr ? `\n${error.stderr}` : '')
      };
    }
  }

  /**
   * Copy backup file into Docker container
   * @private
   */
  async copyFileToContainer(localPath, containerName, containerPath) {
    try {
      const command = `docker cp "${localPath}" ${containerName}:${containerPath}`;
      await execAsync(command);
      console.log(`Copied backup file to container: ${containerPath}`);
    } catch (error) {
      throw new Error(`Failed to copy backup file to container: ${error.message}`);
    }
  }

  /**
   * Validate restore output to determine success
   * @private
   */
  validateRestoreOutput(output, expectedOutput, fileExtension) {
    const outputLower = output.toLowerCase();
    
    // Check for obvious error indicators
    const errorKeywords = [
      'error:',
      'fatal:',
      'could not',
      'permission denied',
      'authentication failed',
      'connection refused',
      'syntax error'
    ];
    
    for (const keyword of errorKeywords) {
      if (outputLower.includes(keyword)) {
        console.error(`Restore failed - found error keyword: ${keyword}`);
        return false;
      }
    }
    
    // Check for file-type specific success indicators
    switch (fileExtension) {
      case '.sql':
        // For SQL files, look for successful execution indicators
        return outputLower.includes('create') || 
               outputLower.includes('insert') || 
               outputLower.includes('commit') ||
               !outputLower.includes('error');
               
      case '.dump':
      case '.backup':
        // For dump files, pg_restore should complete without fatal errors
        return !outputLower.includes('pg_restore: error') &&
               !outputLower.includes('pg_restore: [archiver]');
               
      default:
        return false;
    }
  }

  /**
   * Validate the restored database by running basic checks
   * @param {object} connectionInfo - Database connection info
   * @param {string} containerName - Docker container name
   * @returns {Promise<{tableCount: number, hasData: boolean, errors: Array}>}
   */
  async validateRestoredDatabase(connectionInfo, containerName) {
    const { username, password } = connectionInfo;
    const errors = [];
    
    try {
      // Check table count
      const tableCountCommand = [
        `docker exec -e PGPASSWORD=${password}`,
        containerName,
        'psql -h localhost -p 5432',
        `-U ${username} -d testdb`,
        '-t -c',
        '"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\';"'
      ].join(' ');
      
      const { stdout: tableCountOutput } = await execAsync(tableCountCommand);
      const tableCount = parseInt(tableCountOutput.trim()) || 0;
      
      // Check if there's any data
      let hasData = false;
      if (tableCount > 0) {
        const dataCheckCommand = [
          `docker exec -e PGPASSWORD=${password}`,
          containerName,
          'psql -h localhost -p 5432',
          `-U ${username} -d testdb`,
          '-t -c',
          '"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 1);"'
        ].join(' ');
        
        const { stdout: dataOutput } = await execAsync(dataCheckCommand);
        hasData = dataOutput.trim().toLowerCase() === 't';
      }
      
      return {
        tableCount,
        hasData,
        errors
      };
      
    } catch (error) {
      errors.push(`Database validation failed: ${error.message}`);
      return {
        tableCount: 0,
        hasData: false,
        errors
      };
    }
  }

  /**
   * Ensure temp directory exists
   * @private
   */
  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean up temporary files
   * @param {string} filePath 
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to cleanup temp file ${filePath}:`, error.message);
    }
  }
}

module.exports = RestoreAutomation;
