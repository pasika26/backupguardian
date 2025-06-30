const BaseDatabase = require('./base-database');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * PostgreSQL database implementation
 * Extracted from docker-runner.js and restore-automation.js
 */
class PostgreSQLDatabase extends BaseDatabase {
  constructor(config = {}) {
    super(config);
    this.defaultImage = config.image || 'postgres:15-alpine';
    this.defaultPort = config.port || 5432;
    this.defaultUser = config.user || 'testuser';
    this.defaultDatabase = config.database || 'testdb';
    this.defaultPassword = config.password || 'testpass123';
  }

  /**
   * Create and start a PostgreSQL test container
   */
  async createContainer(testId) {
    const containerName = `${this.containerPrefix}-${testId}`;
    const dbPassword = this.defaultPassword;
    const dbName = this.defaultDatabase;
    const dbUser = this.defaultUser;
    const port = await this.getAvailablePort();

    try {
      // Pull PostgreSQL image if not available
      console.log('Pulling PostgreSQL image...');
      await execAsync(`docker pull ${this.defaultImage}`);

      // Create and start container
      console.log(`Creating container: ${containerName}`);
      const createCommand = [
        'docker run -d',
        `--name ${containerName}`,
        `-p ${port}:${this.defaultPort}`,
        `-e POSTGRES_DB=${dbName}`,
        `-e POSTGRES_USER=${dbUser}`,
        `-e POSTGRES_PASSWORD=${dbPassword}`,
        '--rm', // Auto-remove when stopped
        this.defaultImage
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
   */
  async waitForContainer(containerName, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { stdout } = await execAsync(
          `docker exec ${containerName} pg_isready -U ${this.defaultUser} -d ${this.defaultDatabase}`
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
   * Restore a backup file to PostgreSQL container
   */
  async restoreBackup(backupFilePath, connectionInfo, containerName) {
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
          `-p ${this.defaultPort}`, // Internal container port
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
          `-p ${this.defaultPort}`,
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
   * Validate data integrity of the restored PostgreSQL database
   */
  async validateData(connectionInfo, containerName, options = {}) {
    const { username, password } = connectionInfo;
    const errors = [];
    
    try {
      // Check table count
      const tableCountCommand = [
        `docker exec -e PGPASSWORD=${password}`,
        containerName,
        `psql -h localhost -p ${this.defaultPort}`,
        `-U ${username} -d ${this.defaultDatabase}`,
        '-t -c',
        '"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\';"'
      ].join(' ');
      
      const { stdout: tableCountOutput } = await execAsync(tableCountCommand);
      const tableCount = parseInt(tableCountOutput.trim()) || 0;
      
      // Check if there's any data
      let hasData = false;
      let totalRows = 0;
      const tableStats = [];
      
      if (tableCount > 0) {
        // Get table names and row counts
        const tablesCommand = [
          `docker exec -e PGPASSWORD=${password}`,
          containerName,
          `psql -h localhost -p ${this.defaultPort}`,
          `-U ${username} -d ${this.defaultDatabase}`,
          '-t -c',
          '"SELECT tablename FROM pg_tables WHERE schemaname = \'public\';"'
        ].join(' ');
        
        const { stdout: tablesOutput } = await execAsync(tablesCommand);
        const tables = tablesOutput.trim().split('\n').filter(t => t.trim());
        
        for (const table of tables) {
          const tableName = table.trim();
          if (tableName) {
            try {
              const rowCountCommand = [
                `docker exec -e PGPASSWORD=${password}`,
                containerName,
                `psql -h localhost -p ${this.defaultPort}`,
                `-U ${username} -d ${this.defaultDatabase}`,
                '-t -c',
                `"SELECT COUNT(*) FROM ${tableName};"`
              ].join(' ');
              
              const { stdout: rowCountOutput } = await execAsync(rowCountCommand);
              const rowCount = parseInt(rowCountOutput.trim()) || 0;
              totalRows += rowCount;
              
              tableStats.push({
                tableName,
                rowCount,
                isEmpty: rowCount === 0
              });
            } catch (error) {
              errors.push(`Failed to count rows in table ${tableName}: ${error.message}`);
            }
          }
        }
        
        hasData = totalRows > 0;
      }
      
      return {
        success: errors.length === 0,
        tableCount,
        hasData,
        totalRows,
        tableStats,
        details: {
          emptyTables: tableStats.filter(t => t.isEmpty).map(t => t.tableName),
          largeTables: tableStats.filter(t => t.rowCount > 10000).map(t => ({ name: t.tableName, rows: t.rowCount })),
          dataIntegrityIssues: []
        },
        errors
      };
      
    } catch (error) {
      errors.push(`Database validation failed: ${error.message}`);
      return {
        success: false,
        tableCount: 0,
        hasData: false,
        totalRows: 0,
        tableStats: [],
        details: { emptyTables: [], largeTables: [], dataIntegrityIssues: [] },
        errors
      };
    }
  }

  /**
   * Validate schema of the restored PostgreSQL database
   */
  async validateSchema(connectionInfo, containerName, originalSchema = null) {
    const { username, password } = connectionInfo;
    const errors = [];
    
    try {
      // Get comprehensive schema information
      const schemaDetails = await this.getSchemaDetails(connectionInfo, containerName);
      
      let comparison = null;
      if (originalSchema) {
        comparison = this.compareSchemas(originalSchema, schemaDetails);
      }
      
      return {
        success: errors.length === 0 && (!comparison || comparison.identical),
        details: schemaDetails,
        comparison,
        errors
      };
      
    } catch (error) {
      errors.push(`Schema validation failed: ${error.message}`);
      return {
        success: false,
        details: null,
        comparison: null,
        errors
      };
    }
  }

  /**
   * Get detailed schema information
   * @private
   */
  async getSchemaDetails(connectionInfo, containerName) {
    const { username, password } = connectionInfo;
    
    const queries = {
      tables: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`,
      views: `SELECT viewname FROM pg_views WHERE schemaname = 'public';`,
      indexes: `SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`,
      sequences: `SELECT sequencename FROM pg_sequences WHERE schemaname = 'public';`,
      functions: `SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');`
    };
    
    const results = {};
    
    for (const [type, query] of Object.entries(queries)) {
      try {
        const command = [
          `docker exec -e PGPASSWORD=${password}`,
          containerName,
          `psql -h localhost -p ${this.defaultPort}`,
          `-U ${username} -d ${this.defaultDatabase}`,
          '-t -c',
          `"${query}"`
        ].join(' ');
        
        const { stdout } = await execAsync(command);
        results[type] = stdout.trim().split('\n').filter(item => item.trim()).map(item => item.trim());
      } catch (error) {
        console.warn(`Failed to get ${type}: ${error.message}`);
        results[type] = [];
      }
    }
    
    return results;
  }

  /**
   * Compare two schemas
   * @private
   */
  compareSchemas(originalSchema, currentSchema) {
    const differences = [];
    
    for (const [type, items] of Object.entries(originalSchema)) {
      const currentItems = currentSchema[type] || [];
      const originalItems = items || [];
      
      // Find missing items
      const missing = originalItems.filter(item => !currentItems.includes(item));
      const extra = currentItems.filter(item => !originalItems.includes(item));
      
      if (missing.length > 0) {
        differences.push({ type, category: 'missing', items: missing });
      }
      if (extra.length > 0) {
        differences.push({ type, category: 'extra', items: extra });
      }
    }
    
    return {
      identical: differences.length === 0,
      differences,
      summary: {
        totalDifferences: differences.length,
        criticalIssues: differences.filter(d => d.type === 'tables' || d.type === 'views').length
      }
    };
  }

  /**
   * Clean up PostgreSQL container
   */
  async cleanup(containerName) {
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
   * Get connection information for PostgreSQL
   */
  async getConnectionInfo(testId) {
    const port = await this.getAvailablePort();
    return {
      host: 'localhost',
      port: port,
      database: this.defaultDatabase,
      username: this.defaultUser,
      password: this.defaultPassword
    };
  }

  /**
   * Get the database type identifier
   */
  getDatabaseType() {
    return 'postgresql';
  }

  /**
   * Get supported file extensions for PostgreSQL
   */
  getSupportedExtensions() {
    return ['.sql', '.dump', '.backup'];
  }
}

module.exports = PostgreSQLDatabase;
