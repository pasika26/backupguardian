const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * Middleware to verify admin access
 * Must be used after authenticateToken middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be set by authenticateToken middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    const result = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // User is admin, proceed to next middleware
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = { requireAdmin };
