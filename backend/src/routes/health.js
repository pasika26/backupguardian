const express = require('express');
const { query } = require('../db');
const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await query('SELECT 1 as alive');
    const dbStatus = dbCheck.rows.length > 0 ? 'connected' : 'disconnected';
    
    // Get basic stats
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM backups'),
      query('SELECT COUNT(*) as count FROM test_runs'),
      query('SELECT COUNT(*) as count FROM test_results')
    ]);
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      database: {
        status: dbStatus,
        stats: {
          users: parseInt(stats[0].rows[0].count),
          backups: parseInt(stats[1].rows[0].count),
          testRuns: parseInt(stats[2].rows[0].count),
          testResults: parseInt(stats[3].rows[0].count)
        }
      }
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
