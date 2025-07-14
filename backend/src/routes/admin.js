const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Total users
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    
    // Users registered in last 30 days
    const recentUsers = await query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    // Total backups uploaded
    const totalBackups = await query('SELECT COUNT(*) as count FROM backups WHERE is_active = true');
    
    // Total test runs
    const totalTests = await query('SELECT COUNT(*) as count FROM test_runs');
    
    // Test runs by status
    const testsByStatus = await query(`
      SELECT status, COUNT(*) as count 
      FROM test_runs 
      GROUP BY status
    `);
    
    // Daily activity (last 7 days)
    const dailyActivity = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as uploads
      FROM backups 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(totalUsers.rows[0].count),
          recent: parseInt(recentUsers.rows[0].count)
        },
        backups: {
          total: parseInt(totalBackups.rows[0].count)
        },
        tests: {
          total: parseInt(totalTests.rows[0].count),
          byStatus: testsByStatus.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {})
        },
        activity: {
          daily: dailyActivity.rows
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get all users with activity info
 * GET /api/admin/users
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const users = await query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        COUNT(DISTINCT b.id) as backup_count,
        COUNT(DISTINCT tr.id) as test_count,
        MAX(b.upload_date) as last_upload,
        MAX(tr.started_at) as last_test
      FROM users u
      LEFT JOIN backups b ON u.id = b.user_id AND b.is_active = true
      LEFT JOIN test_runs tr ON u.id = tr.user_id
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      data: {
        users: users.rows.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          joinedAt: user.created_at,
          backupCount: parseInt(user.backup_count) || 0,
          testCount: parseInt(user.test_count) || 0,
          lastUpload: user.last_upload,
          lastTest: user.last_test
        }))
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get recent activity
 * GET /api/admin/activity
 */
router.get('/activity', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const recentBackups = await query(`
      SELECT 
        b.file_name,
        b.upload_date,
        u.email,
        tr.status as test_status
      FROM backups b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN test_runs tr ON b.id = tr.backup_id
      WHERE b.is_active = true
      ORDER BY b.upload_date DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: {
        recentBackups: recentBackups.rows
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
