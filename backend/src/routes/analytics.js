const express = require('express');
const router = express.Router();
const { query } = require('../db');

// CLI Analytics endpoint
router.post('/cli', async (req, res) => {
  try {
    const { event, properties } = req.body;
    
    // Validate required fields
    if (!event || !properties) {
      return res.status(400).json({ error: 'Missing event or properties' });
    }

    // Extract analytics data
    const analyticsData = {
      event,
      machine_id: properties.machineId,
      os: properties.os,
      os_version: properties.osVersion,
      node_version: properties.nodeVersion,
      cli_version: properties.cliVersion,
      timestamp: new Date(properties.timestamp || new Date()),
      
      // Command-specific data
      duration: properties.duration || null,
      success: properties.success || null,
      file_type: properties.fileType || null,
      error_message: properties.error || null,
      
      // Options used
      options: properties.options ? JSON.stringify(properties.options) : null
    };

    // Store in database
    await query(`
      INSERT INTO cli_analytics (
        event, machine_id, os, os_version, node_version, cli_version,
        timestamp, duration, success, file_type, error_message, options
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      analyticsData.event,
      analyticsData.machine_id,
      analyticsData.os,
      analyticsData.os_version,
      analyticsData.node_version,
      analyticsData.cli_version,
      analyticsData.timestamp,
      analyticsData.duration,
      analyticsData.success,
      analyticsData.file_type,
      analyticsData.error_message,
      analyticsData.options
    ]);

    // Return success (minimal response for privacy)
    res.status(200).json({ status: 'recorded' });
    
  } catch (error) {
    console.error('Analytics error:', error);
    // Don't expose internal errors to CLI
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin analytics dashboard endpoint
router.get('/summary', async (req, res) => {
  try {
    // Basic authentication check (add proper auth middleware in production)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.includes('admin-key')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get analytics summary
    const [
      totalUsers,
      totalCommands,
      commandStats,
      osStats,
      recentActivity
    ] = await Promise.all([
      // Unique users count
      query(`
        SELECT COUNT(DISTINCT machine_id) as count 
        FROM cli_analytics 
        WHERE timestamp >= datetime('now', '-30 days')
      `),
      
      // Total commands
      query(`
        SELECT COUNT(*) as count 
        FROM cli_analytics 
        WHERE timestamp >= datetime('now', '-30 days')
      `),
      
      // Command breakdown
      query(`
        SELECT event, COUNT(*) as count, 
               AVG(duration) as avg_duration,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
        FROM cli_analytics 
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY event
        ORDER BY count DESC
      `),
      
      // OS breakdown
      query(`
        SELECT os, COUNT(DISTINCT machine_id) as unique_users
        FROM cli_analytics 
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY os
        ORDER BY unique_users DESC
      `),
      
      // Recent activity (last 7 days)
      query(`
        SELECT date(timestamp) as day, COUNT(*) as commands
        FROM cli_analytics 
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY date(timestamp)
        ORDER BY day DESC
      `)
    ]);

    res.json({
      period: 'Last 30 days',
      summary: {
        uniqueUsers: totalUsers[0]?.count || 0,
        totalCommands: totalCommands[0]?.count || 0,
        commands: commandStats,
        platforms: osStats,
        recentActivity: recentActivity
      }
    });
    
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
