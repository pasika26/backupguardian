const db = require('../db');

class ResultStorage {
  constructor() {
    this.db = db;
  }

  /**
   * Store validation result in the database
   * @param {object} validationResult - Result from BackupValidator
   * @param {string} backupId - UUID of the backup
   * @param {string} userId - UUID of the user
   * @returns {Promise<string>} - Test run ID
   */
  async storeValidationResult(validationResult, backupId, userId) {
    // Handle both PostgreSQL (with connection pooling) and SQLite
    const isPostgreSQL = typeof this.db.connect === 'function';
    let client = null;
    
    if (isPostgreSQL) {
      client = await this.db.connect();
      await client.query('BEGIN');
    } else {
      // SQLite doesn't need connection pooling, use direct connection
      client = this.db;
      await client.query('BEGIN TRANSACTION');
    }
    
    try {
      
      // Insert test run record
      const testRunInsert = `
        INSERT INTO test_runs (
          backup_id, user_id, status, started_at, completed_at, 
          duration_seconds, error_message, docker_container_id, test_database_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const testRunValues = [
        backupId,
        userId,
        validationResult.success ? 'completed' : 'failed',
        validationResult.startTime,
        validationResult.endTime,
        Math.round(validationResult.duration / 1000), // Convert to seconds
        validationResult.errors.length > 0 ? validationResult.errors.join('; ') : null,
        validationResult.testId, // Using testId as container reference
        validationResult.databaseInfo?.connectionInfo?.database || 'testdb'
      ];
      
      const testRunResult = await client.query(testRunInsert, testRunValues);
      const testRunId = testRunResult.rows[0].id;
      
      // Insert individual test results for each stage
      await this.insertStageResults(client, testRunId, validationResult);
      
      // Insert database validation results if available
      if (validationResult.databaseInfo && validationResult.stages.validation.success) {
        await this.insertDatabaseValidationResults(client, testRunId, validationResult);
      }
      
      if (isPostgreSQL) {
        await client.query('COMMIT');
      } else {
        await client.query('COMMIT');
      }
      console.log(`✅ Validation result stored with test run ID: ${testRunId}`);
      
      return testRunId;
      
    } catch (error) {
      if (isPostgreSQL) {
        await client.query('ROLLBACK');
      } else {
        await client.query('ROLLBACK');
      }
      console.error('❌ Failed to store validation result:', error.message);
      throw new Error(`Failed to store validation result: ${error.message}`);
    } finally {
      if (isPostgreSQL) {
        client.release();
      }
      // SQLite doesn't need to release connections
    }
  }

  /**
   * Insert results for each validation stage
   * @private
   */
  async insertStageResults(client, testRunId, validationResult) {
    const stageInsert = `
      INSERT INTO test_results (
        test_run_id, test_type, status, expected_value, actual_value, 
        error_details, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const stages = validationResult.stages;
    
    // Container creation result
    await client.query(stageInsert, [
      testRunId,
      'container_creation',
      stages.containerCreation.success ? 'passed' : 'failed',
      'Container created successfully',
      stages.containerCreation.success ? 'Container created' : 'Container creation failed',
      stages.containerCreation.error,
      stages.containerCreation.duration
    ]);
    
    // Restore result
    await client.query(stageInsert, [
      testRunId,
      'restore_success',
      stages.restore.success ? 'passed' : 'failed',
      'Backup restored without errors',
      stages.restore.success ? 'Restore successful' : 'Restore failed',
      stages.restore.error,
      stages.restore.duration
    ]);
    
    // Database validation result
    await client.query(stageInsert, [
      testRunId,
      'database_validation',
      stages.validation.success ? 'passed' : 'failed',
      'Database structure validated',
      stages.validation.success ? 'Validation passed' : 'Validation failed',
      stages.validation.error,
      stages.validation.duration
    ]);
    
    // Cleanup result
    await client.query(stageInsert, [
      testRunId,
      'cleanup',
      stages.cleanup.success ? 'passed' : 'failed',
      'Container cleaned up successfully',
      stages.cleanup.success ? 'Cleanup successful' : 'Cleanup failed',
      stages.cleanup.error,
      stages.cleanup.duration
    ]);
  }

  /**
   * Insert detailed database validation results
   * @private
   */
  async insertDatabaseValidationResults(client, testRunId, validationResult) {
    const resultInsert = `
      INSERT INTO test_results (
        test_run_id, test_type, status, expected_value, actual_value, 
        error_details, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const dbInfo = validationResult.databaseInfo;
    
    // Table count validation
    await client.query(resultInsert, [
      testRunId,
      'table_count',
      dbInfo.tableCount > 0 ? 'passed' : 'warning',
      'At least 1 table',
      `${dbInfo.tableCount} tables found`,
      dbInfo.tableCount === 0 ? 'No tables found in restored database' : null,
      0 // Part of the overall validation time
    ]);
    
    // Data presence validation
    await client.query(resultInsert, [
      testRunId,
      'data_presence',
      dbInfo.hasData ? 'passed' : 'warning',
      'Database contains data',
      dbInfo.hasData ? 'Data found' : 'No data found',
      !dbInfo.hasData ? 'Restored database appears to be empty' : null,
      0
    ]);
  }

  /**
   * Retrieve test run details by ID
   * @param {string} testRunId 
   * @returns {Promise<object>}
   */
  async getTestRun(testRunId) {
    const query = `
      SELECT 
        tr.*,
        b.file_name,
        b.file_type,
        b.file_size,
        u.email as user_email
      FROM test_runs tr
      JOIN backups b ON tr.backup_id = b.id
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1
    `;
    
    const result = await this.db.query(query, [testRunId]);
    if (result.rows.length === 0) {
      throw new Error(`Test run not found: ${testRunId}`);
    }
    
    return result.rows[0];
  }

  /**
   * Retrieve test results for a test run
   * @param {string} testRunId 
   * @returns {Promise<Array>}
   */
  async getTestResults(testRunId) {
    const query = `
      SELECT * FROM test_results 
      WHERE test_run_id = $1 
      ORDER BY created_at ASC
    `;
    
    const result = await this.db.query(query, [testRunId]);
    return result.rows;
  }

  /**
   * Get test runs for a user
   * @param {string} userId 
   * @param {object} options - Pagination and filtering options
   * @returns {Promise<{runs: Array, total: number}>}
   */
  async getTestRunsForUser(userId, options = {}) {
    const { limit = 50, offset = 0, status = null, backupId = null } = options;
    
    let whereClause = 'WHERE tr.user_id = $1';
    const params = [userId];
    let paramCount = 1;
    
    if (status) {
      whereClause += ` AND tr.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (backupId) {
      whereClause += ` AND tr.backup_id = $${++paramCount}`;
      params.push(backupId);
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM test_runs tr ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const runsQuery = `
      SELECT 
        tr.*,
        b.file_name,
        b.file_type,
        b.file_size,
        COUNT(trs.id) as result_count,
        COUNT(CASE WHEN trs.status = 'passed' THEN 1 END) as passed_count,
        COUNT(CASE WHEN trs.status = 'failed' THEN 1 END) as failed_count
      FROM test_runs tr
      JOIN backups b ON tr.backup_id = b.id
      LEFT JOIN test_results trs ON tr.id = trs.test_run_id
      ${whereClause}
      GROUP BY tr.id, b.file_name, b.file_type, b.file_size
      ORDER BY tr.started_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(limit, offset);
    
    const runsResult = await this.db.query(runsQuery, params);
    
    return {
      runs: runsResult.rows,
      total,
      limit,
      offset
    };
  }

  /**
   * Get validation statistics for a user
   * @param {string} userId 
   * @param {object} options - Date range and filtering options
   * @returns {Promise<object>}
   */
  async getValidationStats(userId, options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date() 
    } = options;
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
        AVG(duration_seconds) as avg_duration_seconds,
        MIN(started_at) as first_test_date,
        MAX(started_at) as last_test_date
      FROM test_runs 
      WHERE user_id = $1 
        AND started_at >= $2 
        AND started_at <= $3
    `;
    
    const result = await this.db.query(statsQuery, [userId, startDate, endDate]);
    const stats = result.rows[0];
    
    // Convert strings to numbers and calculate success rate
    const totalRuns = parseInt(stats.total_runs) || 0;
    const successfulRuns = parseInt(stats.successful_runs) || 0;
    const failedRuns = parseInt(stats.failed_runs) || 0;
    
    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
      avgDurationSeconds: Math.round(parseFloat(stats.avg_duration_seconds) || 0),
      firstTestDate: stats.first_test_date,
      lastTestDate: stats.last_test_date,
      dateRange: { startDate, endDate }
    };
  }

  /**
   * Delete old test runs and results (cleanup)
   * @param {number} daysOld - Delete runs older than this many days
   * @returns {Promise<number>} - Number of runs deleted
   */
  async cleanupOldTestRuns(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const deleteQuery = `
      DELETE FROM test_runs 
      WHERE started_at < $1
      RETURNING id
    `;
    
    const result = await this.db.query(deleteQuery, [cutoffDate]);
    const deletedCount = result.rows.length;
    
    console.log(`🧹 Cleaned up ${deletedCount} test runs older than ${daysOld} days`);
    return deletedCount;
  }

  /**
   * Create a new test run record
   * @param {object} testRunData - Test run data
   * @returns {Promise<string>} - Test run ID
   */
  async createTestRun({ backupId, userId, filename, fileSize, status = 'pending' }) {
    try {
      const testRunId = 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      await this.db.run(`
        INSERT INTO test_runs (
          id, backup_id, user_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [testRunId, backupId, userId, status]);
      
      console.log(`✅ Created test run: ${testRunId} for backup: ${backupId}`);
      return testRunId;
      
    } catch (error) {
      console.error('❌ Failed to create test run:', error);
      throw new Error(`Failed to create test run: ${error.message}`);
    }
  }

  /**
   * Update a test run record
   * @param {string} testRunId - Test run ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - Updated test run
   */
  async updateTestRun(testRunId, updates) {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(testRunId);
      
      await this.db.run(`
        UPDATE test_runs 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, values);
      
      console.log(`✅ Updated test run: ${testRunId}`);
      return updates;
      
    } catch (error) {
      console.error('❌ Failed to update test run:', error);
      throw new Error(`Failed to update test run: ${error.message}`);
    }
  }
}

module.exports = new ResultStorage();
