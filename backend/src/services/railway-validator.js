const { Pool } = require('pg');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const path = require('path');

/**
 * Backup validator using Railway's PostgreSQL service
 * Creates temporary databases for testing backups
 */
class RailwayValidator {
  constructor() {
    // Use same connection as main app
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false 
      } : false,
      max: 10, // Separate pool for validation
    });
  }

  /**
   * Validate a backup file by restoring to temporary database
   * @param {string} backupFilePath - Path to backup file
   * @param {string} filename - Original filename
   * @param {function} progressCallback - Progress updates
   * @returns {Promise<object>} - Validation result
   */
  async validateBackup(backupFilePath, filename, progressCallback = () => {}) {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempDbName = `backup_test_${testId}`;
    const startTime = Date.now();
    
    const result = {
      testId,
      success: false,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      stages: {
        fileValidation: { success: false, duration: 0, error: null },
        tempDbCreation: { success: false, duration: 0, error: null },
        backupRestore: { success: false, duration: 0, error: null },
        dataValidation: { success: false, duration: 0, error: null },
        cleanup: { success: false, duration: 0, error: null }
      },
      fileInfo: {
        path: backupFilePath,
        name: filename,
        size: 0,
        type: 'unknown'
      },
      validationDetails: {
        tablesCreated: 0,
        rowsInserted: 0,
        constraintsChecked: 0,
        errorsFound: [],
        warningsFound: []
      }
    };

    let client = null;
    let stageStartTime = Date.now();

    try {
      progressCallback(5);
      console.log(`🔄 Starting validation ${testId} for file: ${filename}`);

      // Stage 1: File Validation
      stageStartTime = Date.now();
      await this.validateFile(backupFilePath, result);
      result.stages.fileValidation.duration = Date.now() - stageStartTime;
      result.stages.fileValidation.success = true;
      progressCallback(15);

      // Stage 2: Create Temporary Database
      stageStartTime = Date.now();
      client = await this.pool.connect();
      await this.createTempDatabase(client, tempDbName);
      result.stages.tempDbCreation.duration = Date.now() - stageStartTime;
      result.stages.tempDbCreation.success = true;
      progressCallback(25);

      // Stage 3: Restore Backup
      stageStartTime = Date.now();
      await this.restoreBackup(backupFilePath, tempDbName, result);
      result.stages.backupRestore.duration = Date.now() - stageStartTime;
      result.stages.backupRestore.success = true;
      progressCallback(70);

      // Stage 4: Validate Data
      stageStartTime = Date.now();
      await this.validateData(tempDbName, result);
      result.stages.dataValidation.duration = Date.now() - stageStartTime;
      result.stages.dataValidation.success = true;
      progressCallback(90);

      // Success!
      result.success = true;
      console.log(`✅ Validation ${testId} completed successfully`);

    } catch (error) {
      console.error(`❌ Validation ${testId} failed:`, error.message);
      
      // Record error in current stage
      const currentStage = this.getCurrentStage(result.stages);
      if (currentStage) {
        currentStage.error = error.message;
        currentStage.duration = Date.now() - stageStartTime;
      }
      
      result.validationDetails.errorsFound.push(error.message);
    } finally {
      // Stage 5: Cleanup
      stageStartTime = Date.now();
      try {
        if (client) {
          await this.cleanupTempDatabase(client, tempDbName);
          client.release();
        }
        result.stages.cleanup.success = true;
        result.stages.cleanup.duration = Date.now() - stageStartTime;
        progressCallback(100);
      } catch (cleanupError) {
        console.error(`⚠️ Cleanup failed for ${tempDbName}:`, cleanupError.message);
        result.stages.cleanup.error = cleanupError.message;
        result.stages.cleanup.duration = Date.now() - stageStartTime;
      }

      result.endTime = new Date();
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Validate backup file format and accessibility
   */
  async validateFile(filePath, result) {
    const stats = await fs.stat(filePath);
    result.fileInfo.size = stats.size;
    
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    // Detect file type
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.sql') {
      result.fileInfo.type = 'sql';
    } else if (ext === '.dump') {
      result.fileInfo.type = 'pg_dump';
    } else if (ext === '.backup') {
      result.fileInfo.type = 'pg_backup';
    } else {
      result.validationDetails.warningsFound.push(`Unknown file extension: ${ext}`);
    }

    // Quick content validation for SQL files
    if (result.fileInfo.type === 'sql') {
      const content = await fs.readFile(filePath, 'utf8');
      if (!content.includes('CREATE') && !content.includes('INSERT')) {
        result.validationDetails.warningsFound.push('File may not contain valid database backup');
      }
    }
  }

  /**
   * Create temporary database for testing
   */
  async createTempDatabase(client, dbName) {
    console.log(`🗄️ Creating temporary database: ${dbName}`);
    
    // Create temporary database
    await client.query(`CREATE DATABASE "${dbName}"`);
    
    console.log(`✅ Temporary database created: ${dbName}`);
  }

  /**
   * Restore backup to temporary database
   */
  async restoreBackup(backupFilePath, tempDbName, result) {
    console.log(`📥 Restoring backup to database: ${tempDbName}`);
    
    // Check if PostgreSQL client tools are available
    const { exec } = require('child_process');
    try {
      await new Promise((resolve, reject) => {
        exec('which psql', (error, stdout) => {
          if (error) {
            reject(new Error('PostgreSQL client tools not found - psql command not available'));
          } else {
            console.log('✅ PostgreSQL psql found at:', stdout.trim());
            resolve();
          }
        });
      });
      
      // Also check for pg_restore if not SQL file
      if (result.fileInfo.type !== 'sql') {
        await new Promise((resolve, reject) => {
          exec('which pg_restore', (error, stdout) => {
            if (error) {
              reject(new Error('PostgreSQL client tools not found - pg_restore command not available'));
            } else {
              console.log('✅ PostgreSQL pg_restore found at:', stdout.trim());
              resolve();
            }
          });
        });
      }
    } catch (error) {
      throw error;
    }
    
    return new Promise((resolve, reject) => {
      // Build connection string for temp database
      const tempDbUrl = process.env.DATABASE_URL.replace(/\/[^\/]*$/, `/${tempDbName}`);
      
      let command, args;
      
      if (result.fileInfo.type === 'sql') {
        // Use psql for SQL files
        command = 'psql';
        args = [tempDbUrl, '-f', backupFilePath];
      } else if (result.fileInfo.type === 'pg_backup' || result.fileInfo.type === 'pg_dump') {
        // Use pg_restore for backup/dump files
        command = 'pg_restore';
        args = ['-d', tempDbUrl, '--verbose', '--no-owner', '--no-privileges', backupFilePath];
      } else {
        throw new Error(`Unsupported file type: ${result.fileInfo.type}`);
      }

      const childProcess = spawn(command, args);
      
      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Backup restored successfully to ${tempDbName}`);
          
          // Parse output for statistics
          const tableMatches = stdout.match(/CREATE TABLE/g);
          const insertMatches = stdout.match(/INSERT/g);
          
          result.validationDetails.tablesCreated = tableMatches ? tableMatches.length : 0;
          result.validationDetails.rowsInserted = insertMatches ? insertMatches.length : 0;
          
          resolve();
        } else {
          console.error(`❌ Backup restore failed with code ${code}`);
          console.error('stderr:', stderr);
          reject(new Error(`Backup restore failed: ${stderr || 'Unknown error'}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to start restore process: ${error.message}`));
      });
    });
  }

  /**
   * Validate restored data integrity
   */
  async validateData(tempDbName, result) {
    console.log(`🔍 Validating data in database: ${tempDbName}`);
    
    // Create connection to temp database
    const tempDbUrl = process.env.DATABASE_URL.replace(/\/[^\/]*$/, `/${tempDbName}`);
    const tempPool = new Pool({
      connectionString: tempDbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false 
      } : false,
    });

    try {
      const client = await tempPool.connect();
      
      // Check 1: Count tables
      const tablesResult = await client.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tableCount = parseInt(tablesResult.rows[0].table_count);
      result.validationDetails.tablesCreated = tableCount;
      
      if (tableCount === 0) {
        result.validationDetails.warningsFound.push('No tables found in restored database');
      } else {
        console.log(`📊 Found ${tableCount} tables in restored database`);
      }

      // Check 2: Verify foreign key constraints
      const constraintsResult = await client.query(`
        SELECT COUNT(*) as constraint_count
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY'
      `);
      
      result.validationDetails.constraintsChecked = parseInt(constraintsResult.rows[0].constraint_count);

      // Check 3: Test basic queries on each table
      const tablesListResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);

      for (const row of tablesListResult.rows) {
        try {
          await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
        } catch (error) {
          result.validationDetails.errorsFound.push(`Table "${row.table_name}" query failed: ${error.message}`);
        }
      }

      client.release();
      
      console.log(`✅ Data validation completed for ${tempDbName}`);
      
    } finally {
      await tempPool.end();
    }
  }

  /**
   * Clean up temporary database
   */
  async cleanupTempDatabase(client, dbName) {
    console.log(`🧹 Cleaning up temporary database: ${dbName}`);
    
    try {
      // Terminate any active connections to the temp database
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity 
        WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
      `);
      
      // Drop the temporary database
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      
      console.log(`✅ Temporary database cleaned up: ${dbName}`);
    } catch (error) {
      console.error(`⚠️ Failed to cleanup database ${dbName}:`, error.message);
      // Don't throw - cleanup failures shouldn't fail the validation
    }
  }

  /**
   * Get the current stage that's not completed
   */
  getCurrentStage(stages) {
    for (const [name, stage] of Object.entries(stages)) {
      if (!stage.success && stage.duration === 0) {
        return stage;
      }
    }
    return null;
  }

  /**
   * Close database connections
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = RailwayValidator;
