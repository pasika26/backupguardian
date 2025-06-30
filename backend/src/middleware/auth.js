const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user info to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure still exists and active
    const users = await query(
      'SELECT id, email, first_name, last_name, is_active, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (users.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users.rows[0];
    
    // Check if user is still active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: Boolean(user.email_verified)
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired'
      });
    }
    
    // Log unexpected errors
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = await query(
        'SELECT id, email, first_name, last_name, is_active, email_verified FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (users.rows.length > 0 && users.rows[0].is_active) {
        const user = users.rows[0];
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: Boolean(user.email_verified)
        };
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
