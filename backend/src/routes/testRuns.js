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
    const backups = await query('SELECT id, user_id, file_name FROM backups WHERE id = $1 AND is_active = 1 AND user_id = $2', [backupId, req.user.id]);
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
      VALUES ($1, $2, $3, 'pending', $4)
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
    
    let whereClause = 'tr.user_id = $1';
    const params = [req.user.id];
    
    if (status) {
      whereClause += ' AND tr.status = $2';
      params.push(status);
    }
    
    if (backupId) {
      whereClause += ' AND tr.backup_id = $' + (params.length + 1);
      params.push(backupId);
    }
    
    const testRuns = await query(`
      SELECT 
        tr.id,
        tr.backup_id,
        tr.user_id,
        CASE tr.status 
          WHEN 'completed' THEN 'passed'
          ELSE tr.status 
        END as status,
        tr.started_at as createdAt,
        tr.completed_at as completedAt,
        tr.duration_seconds as duration,
        tr.test_database_name,
        tr.error_message,
        b.file_name as filename,
        b.file_size as fileSize,
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
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = $1', [req.user.id]),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = $1 AND status = $2', [req.user.id, 'passed']),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = $1 AND status = $2', [req.user.id, 'failed']),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = $1 AND status = $2', [req.user.id, 'pending'])
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
      WHERE tr.id = $1 AND tr.user_id = $2
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
      WHERE test_run_id = $1
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
      updates.push('status = $' + (params.length + 1));
      params.push(status);
      
      // Set completed_at if status is completed or failed
      if (status === 'completed' || status === 'failed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    
    if (errorMessage !== undefined) {
      updates.push('error_message = $' + (params.length + 1));
      params.push(errorMessage);
    }
    
    if (durationSeconds !== undefined) {
      updates.push('duration_seconds = $' + (params.length + 1));
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
    
    await query(`UPDATE test_runs SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length}`, params);
    
    res.json({
      success: true,
      message: 'Test run updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Generate JSON report for test run
 * GET /api/test-runs/:id/report/json
 */
router.get('/:id/report/json', authenticateToken, async (req, res, next) => {
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
      WHERE tr.id = $1 AND tr.user_id = $2
    `, [id, req.user.id]);
    
    if (testRuns.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test run not found'
      });
    }
    
    const testRun = testRuns.rows[0];
    
    // Get test results
    const testResults = await query(`
      SELECT *
      FROM test_results
      WHERE test_run_id = $1
      ORDER BY created_at ASC
    `, [id]);
    
    // Generate report
    const report = {
      metadata: {
        reportGenerated: new Date().toISOString(),
        testRunId: testRun.id,
        backupFileName: testRun.backup_file_name,
        testStatus: testRun.status,
        testDuration: testRun.duration_seconds,
        testStarted: testRun.started_at,
        testCompleted: testRun.completed_at
      },
      summary: {
        overallStatus: testRun.status,
        totalChecks: testResults.rows.length,
        passedChecks: testResults.rows.filter(r => r.status === 'passed').length,
        failedChecks: testResults.rows.filter(r => r.status === 'failed').length,
        score: testResults.rows.length > 0 ? 
          Math.round((testResults.rows.filter(r => r.status === 'passed').length / testResults.rows.length) * 100) : 0
      },
      results: testResults.rows.map(result => ({
        checkName: result.check_name,
        checkType: result.check_type,
        status: result.status,
        details: result.details ? JSON.parse(result.details) : null,
        errorMessage: result.error_message,
        executionTime: result.execution_time_ms,
        timestamp: result.created_at
      })),
      recommendations: generateRecommendations(testRun, testResults.rows)
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-validation-report-${testRun.id}.json"`);
    res.json(report);
    
  } catch (error) {
    next(error);
  }
});

/**
 * Generate PDF report for test run
 * GET /api/test-runs/:id/report/pdf
 */
router.get('/:id/report/pdf', authenticateToken, async (req, res, next) => {
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
      WHERE tr.id = $1 AND tr.user_id = $2
    `, [id, req.user.id]);
    
    if (testRuns.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test run not found'
      });
    }
    
    const testRun = testRuns.rows[0];
    
    // Get test results
    const testResults = await query(`
      SELECT *
      FROM test_results
      WHERE test_run_id = $1
      ORDER BY created_at ASC
    `, [id]);
    
    // Generate HTML report
    const htmlReport = generateHtmlReport(testRun, testResults.rows);
    
    // For now, return HTML that can be converted to PDF on frontend
    // In production, would use puppeteer or similar
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="backup-validation-report-${testRun.id}.html"`);
    res.send(htmlReport);
    
  } catch (error) {
    next(error);
  }
});

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testRun, testResults) {
  const recommendations = [];
  
  const failedResults = testResults.filter(r => r.status === 'failed');
  
  if (failedResults.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'Backup Validation Passed',
      description: 'Your backup file has passed all validation checks and is ready for migration.',
      priority: 'info'
    });
  } else {
    recommendations.push({
      type: 'warning',
      title: 'Validation Issues Found',
      description: `${failedResults.length} validation checks failed. Review the detailed results and fix issues before migration.`,
      priority: 'high'
    });
  }
  
  // Add specific recommendations based on failed checks
  failedResults.forEach(result => {
    if (result.check_type === 'restore_check') {
      recommendations.push({
        type: 'error',
        title: 'Restore Failed',
        description: 'The backup file could not be restored. Check for corruption or compatibility issues.',
        priority: 'critical'
      });
    }
    
    if (result.check_type === 'schema_validation') {
      recommendations.push({
        type: 'warning',
        title: 'Schema Issues',
        description: 'Schema validation failed. Verify all tables and relationships are intact.',
        priority: 'high'
      });
    }
    
    if (result.check_type === 'data_validation') {
      recommendations.push({
        type: 'warning',
        title: 'Data Issues',
        description: 'Data validation failed. Check for missing or corrupted data.',
        priority: 'high'
      });
    }
  });
  
  return recommendations;
}

/**
 * Generate HTML report for PDF conversion
 */
function generateHtmlReport(testRun, testResults) {
  const passedCount = testResults.filter(r => r.status === 'passed').length;
  const failedCount = testResults.filter(r => r.status === 'failed').length;
  const score = testResults.length > 0 ? Math.round((passedCount / testResults.length) * 100) : 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Backup Validation Report - ${testRun.backup_file_name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; }
        .score { font-size: 24px; font-weight: bold; color: ${score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'}; }
        .results { margin-top: 20px; }
        .result-item { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .result-passed { border-left-color: #22c55e; }
        .result-failed { border-left-color: #ef4444; }
        .timestamp { color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🛡️ Backup Guardian - Validation Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <p><strong>File:</strong> ${testRun.backup_file_name}</p>
        <p><strong>Test Status:</strong> ${testRun.status}</p>
        <p><strong>Score:</strong> <span class="score">${score}%</span></p>
        <p><strong>Duration:</strong> ${testRun.duration_seconds || 0} seconds</p>
        <p><strong>Total Checks:</strong> ${testResults.length}</p>
        <p><strong>Passed:</strong> ${passedCount} | <strong>Failed:</strong> ${failedCount}</p>
      </div>
      
      <div class="results">
        <h2>Detailed Results</h2>
        ${testResults.map(result => `
          <div class="result-item result-${result.status}">
            <h3>${result.check_name}</h3>
            <p><strong>Status:</strong> ${result.status}</p>
            <p><strong>Type:</strong> ${result.check_type}</p>
            ${result.error_message ? `<p><strong>Error:</strong> ${result.error_message}</p>` : ''}
            <p class="timestamp">Executed: ${new Date(result.created_at).toLocaleString()}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="footer">
        <p><em>Generated by Backup Guardian - Database Backup Validation Tool</em></p>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
