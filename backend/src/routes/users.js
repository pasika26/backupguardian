const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * User registration
 * POST /api/users/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user (let database generate UUID)
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id
    `, [email, passwordHash, firstName || null, lastName || null]);
    
    const userId = result.rows[0].id;
    
    // Generate JWT
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          emailVerified: false
        },
        token
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * User login
 * POST /api/users/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const users = await query(
      'SELECT id, email, password_hash, first_name, last_name, is_active, email_verified, is_admin FROM users WHERE email = $1',
      [email]
    );
    
    if (users.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = users.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: Boolean(user.email_verified),
          isAdmin: Boolean(user.is_admin)
        },
        token
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user profile
 * GET /api/users/me
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // Get user's backup and test run stats
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM backups WHERE user_id = $1 AND is_active = true', [req.user.id]),
      query('SELECT COUNT(*) as count FROM test_runs WHERE user_id = $1', [req.user.id]),
      query(`
        SELECT COUNT(*) as count FROM test_runs 
        WHERE user_id = $1 AND status = 'completed'
      `, [req.user.id]),
      query(`
        SELECT COUNT(*) as count FROM test_runs 
        WHERE user_id = $1 AND status = 'failed'
      `, [req.user.id])
    ]);
    
    res.json({
      success: true,
      data: {
        user: req.user,
        stats: {
          totalBackups: parseInt(stats[0].rows[0].count),
          totalTestRuns: parseInt(stats[1].rows[0].count),
          successfulTests: parseInt(stats[2].rows[0].count),
          failedTests: parseInt(stats[3].rows[0].count)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all users (admin endpoint for testing)
 * GET /api/users
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, email, first_name, last_name, is_active, email_verified, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: {
        users: users.rows,
        count: users.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
