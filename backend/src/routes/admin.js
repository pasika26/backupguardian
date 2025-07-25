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
    // Safe query helper
    async function safeQuery(sql, params = []) {
      try {
        return await query(sql, params);
      } catch (error) {
        console.warn('Safe query failed:', error.message);
        return [{ count: 0 }];
      }
    }

    // Total users
    const totalUsers = await safeQuery('SELECT COUNT(*) as count FROM users');
    
    // Users registered in last 30 days
    const recentUsers = await safeQuery(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= date('now', '-30 days')
    `);
    
    // Total backups uploaded (safe)
    const totalBackups = await safeQuery('SELECT COUNT(*) as count FROM backups WHERE is_active = true');
    
    // Total test runs (safe)
    const totalTests = await safeQuery('SELECT COUNT(*) as count FROM test_runs');
    
    // Test runs by status (safe)
    const testsByStatus = await safeQuery(`
      SELECT status, COUNT(*) as count 
      FROM test_runs 
      GROUP BY status
    `);
    
    // Daily activity (last 7 days) (safe)
    const dailyActivity = await safeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as uploads
      FROM backups 
      WHERE created_at >= date('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      success: true,
      data: {
        users: {
          total: parseInt((totalUsers.rows || totalUsers)[0].count),
          recent: parseInt((recentUsers.rows || recentUsers)[0].count)
        },
        backups: {
          total: parseInt((totalBackups.rows || totalBackups)[0].count)
        },
        tests: {
          total: parseInt((totalTests.rows || totalTests)[0].count),
          byStatus: (testsByStatus.rows || testsByStatus).reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {})
        },
        activity: {
          daily: dailyActivity.rows || dailyActivity
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
        u.is_active,
        u.is_admin,
        COUNT(DISTINCT b.id) as backup_count,
        COUNT(DISTINCT tr.id) as test_count,
        MAX(b.upload_date) as last_upload,
        MAX(tr.started_at) as last_test
      FROM users u
      LEFT JOIN backups b ON u.id = b.user_id AND b.is_active = true
      LEFT JOIN test_runs tr ON u.id = tr.user_id
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.is_active, u.is_admin
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
          isActive: Boolean(user.is_active),
          isAdmin: Boolean(user.is_admin),
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

/**
 * Toggle user active status
 * PUT /api/admin/users/:userId/toggle-active
 */
router.put('/users/:userId/toggle-active', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Get current user status
    const currentUser = await query('SELECT is_active FROM users WHERE id = $1', [userId]);
    
    if (currentUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const newStatus = !currentUser.rows[0].is_active;
    
    // Update user status
    await query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [newStatus, userId]
    );
    
    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId,
        isActive: newStatus
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user and all associated data
 * DELETE /api/admin/users/:userId
 */
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Prevent deleting admin users
    const userCheck = await query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (userCheck.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }
    
    // Delete user and cascade to related data
    // Note: This assumes foreign key constraints with CASCADE DELETE
    await query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get user details with activity summary
 * GET /api/admin/users/:userId
 */
router.get('/users/:userId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const userResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.is_active,
        u.email_verified,
        u.is_admin,
        COUNT(DISTINCT b.id) as backup_count,
        COUNT(DISTINCT tr.id) as test_count,
        MAX(b.upload_date) as last_upload,
        MAX(tr.started_at) as last_test,
        SUM(b.file_size) as total_storage_used
      FROM users u
      LEFT JOIN backups b ON u.id = b.user_id AND b.is_active = true
      LEFT JOIN test_runs tr ON u.id = tr.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.is_active, u.email_verified, u.is_admin
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get recent activity
    const recentActivity = await query(`
      SELECT 
        'backup' as type,
        b.file_name as description,
        b.upload_date as timestamp
      FROM backups b
      WHERE b.user_id = $1 AND b.is_active = true
      UNION ALL
      SELECT 
        'test' as type,
        ('Test for ' || b.file_name) as description,
        tr.started_at as timestamp
      FROM test_runs tr
      JOIN backups b ON tr.backup_id = b.id
      WHERE tr.user_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          joinedAt: user.created_at,
          isActive: Boolean(user.is_active),
          emailVerified: Boolean(user.email_verified),
          isAdmin: Boolean(user.is_admin),
          backupCount: parseInt(user.backup_count) || 0,
          testCount: parseInt(user.test_count) || 0,
          lastUpload: user.last_upload,
          lastTest: user.last_test,
          totalStorageUsed: parseInt(user.total_storage_used) || 0
        },
        recentActivity: recentActivity.rows
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
