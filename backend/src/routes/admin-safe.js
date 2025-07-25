// Safe version of admin stats that won't crash if tables don't exist
const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * Get admin dashboard statistics (production-safe)
 * GET /api/admin/stats
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const stats = {
      users: { total: 0, recent: 0 },
      backups: { total: 0 },
      tests: { total: 0, byStatus: [] },
      activity: []
    };

    // Safe query helper
    async function safeQuery(sql, params = []) {
      try {
        return await query(sql, params);
      } catch (error) {
        console.warn('Safe query failed:', error.message);
        return [];
      }
    }

    // Total users (should always work since you logged in)
    try {
      const totalUsers = await query('SELECT COUNT(*) as count FROM users');
      stats.users.total = totalUsers[0]?.count || 0;
    } catch (error) {
      console.error('Users query failed:', error);
    }

    // Recent users
    try {
      const recentUsers = await query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= date('now', '-30 days')
      `);
      stats.users.recent = recentUsers[0]?.count || 0;
    } catch (error) {
      console.warn('Recent users query failed:', error);
    }

    // Try backups table
    const backupsResult = await safeQuery('SELECT COUNT(*) as count FROM backups WHERE is_active = true');
    stats.backups.total = backupsResult[0]?.count || 0;

    // Try test_runs table
    const testsResult = await safeQuery('SELECT COUNT(*) as count FROM test_runs');
    stats.tests.total = testsResult[0]?.count || 0;

    // Test runs by status
    stats.tests.byStatus = await safeQuery(`
      SELECT status, COUNT(*) as count 
      FROM test_runs 
      GROUP BY status
    `);

    // Daily activity
    stats.activity = await safeQuery(`
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
      data: stats,
      message: 'Stats retrieved (production-safe mode)'
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
});

module.exports = router;
