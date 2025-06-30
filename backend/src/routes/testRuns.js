const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Create new test run
 * POST /api/test-runs
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { backupId } = req.body;
    
    if (!backupId) {
      return res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
    }
    
    // Verify backup exists and user owns it
    const backups = await query('SELECT id, user_id, file_name FROM backups WHERE id = ? AND is_active = 1 AND user_id = ?', [backupId, req.user.id]);
    if (backups.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    const backup = backups.rows[0];
    
    // Generate test run ID and database name
    const testRunId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const testDatabaseName = `test_${testRunId.substring(0, 8)}`;
    
    // Create test run
    await query(`
      INSERT INTO test_runs (id, backup_id, user_id, status, test_database_name)
      VALUES (?, ?, ?, 'pending', ?)
    `, [testRunId, backupId, backup.user_id, testDatabaseName]);
    
    res.status(201).json({
      success: true,
      message: 'Test run created successfully',
      data: {
        testRun: {
          id: testRunId,
          backupId,
          status: 'pending',
          testDatabaseName,
          createdAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get all test runs
 * GET /api/test-runs
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, backupId } = req.query;
    
    let whereClause = 'tr.user_id = ?';
    const params = [req.user.id];
    
    if (status) {
      whereClause += ' AND tr.status = ?';
      params.push(status);
    }
    
    if (backupId) {
      whereClause += ' AND tr.backup_id = ?';
      params.push(backupId);
    }
    
    const testRuns = await query(`
      SELECT 
        tr.*,
        b.file_name as backup_file_name,
        u.email as user_email,
        COUNT(tres.id) as result_count
      FROM test_runs tr
      JOIN backups b ON tr.backup_id = b.id
      JOIN users u ON tr.user_id = u.id
      LEFT JOIN test_results tres ON tr.id = tres.test_run_id
      WHERE ${whereClause}
      GROUP BY tr.id
      ORDER BY tr.started_at DESC
    `, params);
    
    res.json({
      success: true,
      data: {
        testRuns: testRuns.rows,
        count: testRuns.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get test run statistics for current user
 * GET /api/test-runs/stats
 */
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = ?', [req.user.id]),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = ? AND status = ?', [req.user.id, 'passed']),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = ? AND status = ?', [req.user.id, 'failed']),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = ? AND status = ?', [req.user.id, 'pending'])
    ]);
    
    res.json({
      totalTests: parseInt(stats[0].rows[0].count),
      passedTests: parseInt(stats[1].rows[0].count),
      failedTests: parseInt(stats[2].rows[0].count),
      pendingTests: parseInt(stats[3].rows[0].count)
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get test run by ID
 * GET /api/test-runs/:id
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get test run details
    const testRuns = await query(`
      SELECT 
        tr.*,
        b.file_name as backup_file_name,
        b.file_type as backup_file_type,
        b.database_name as backup_database_name,
        u.email as user_email
      FROM test_runs tr
      JOIN backups b ON tr.backup_id = b.id
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = ? AND tr.user_id = ?
    `, [id, req.user.id]);
    
    if (testRuns.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test run not found'
      });
    }
    
    // Get test results
    const testResults = await query(`
      SELECT *
      FROM test_results
      WHERE test_run_id = ?
      ORDER BY created_at ASC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        testRun: testRuns.rows[0],
        testResults: testResults.rows
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Update test run status
 * PATCH /api/test-runs/:id
 */
router.patch('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, errorMessage, durationSeconds } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      // Set completed_at if status is completed or failed
      if (status === 'completed' || status === 'failed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    
    if (errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(errorMessage);
    }
    
    if (durationSeconds !== undefined) {
      updates.push('duration_seconds = ?');
      params.push(durationSeconds);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, req.user.id);
    
    await query(`UPDATE test_runs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    
    res.json({
      success: true,
      message: 'Test run updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
