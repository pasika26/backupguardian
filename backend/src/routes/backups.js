const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const QueueService = require('../services/queue-service');
const ResultStorage = require('../services/result-storage');
const StorageService = require('../services/storage-service');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `backup-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept .sql, .dump, and .backup files
  const allowedExtensions = ['.sql', '.dump', '.backup'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed`);
    error.statusCode = 400;
    cb(error);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

/**
 * Upload backup file
 * POST /api/backups/upload
 */
router.post('/upload', authenticateToken, upload.single('backup'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No backup file provided'
      });
    }
    
    const { databaseName, description } = req.body;
    const userId = req.user.id; // From auth middleware
    
    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileType = 'sql';
    if (ext === '.dump') fileType = 'dump';
    if (ext === '.backup') fileType = 'custom';
    
    // Generate backup ID
    const backupId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Save backup record to database
    await query(`
      INSERT INTO backups (id, user_id, file_name, file_path, file_size, file_type, database_name, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      backupId,
      userId,
      req.file.originalname,
      req.file.path,
      req.file.size,
      fileType,
      databaseName || null,
      description || null
    ]);

    // Create a test run record
    const testRunId = await ResultStorage.createTestRun({
      backupId,
      userId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      status: 'pending'
    });

    // Queue the validation job
    await QueueService.queueValidation({
      testRunId,
      backupId,
      filePath: req.file.path,
      filename: req.file.originalname,
      userId,
      startedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Backup uploaded successfully and validation queued',
      data: {
        backup: {
          id: backupId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType,
          databaseName,
          description,
          uploadDate: new Date().toISOString()
        },
        testRun: {
          id: testRunId,
          status: 'pending'
        }
      }
    });
    
  } catch (error) {
    // Clean up uploaded file if database save fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to cleanup uploaded file:', unlinkError);
      }
    }
    next(error);
  }
});

/**
 * Get all backups for user
 * GET /api/backups
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    // Filter by authenticated user
    const backups = await query(`
      SELECT 
        b.*,
        u.email as user_email,
        COUNT(tr.id) as test_run_count,
        MAX(tr.started_at) as last_test_date
      FROM backups b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN test_runs tr ON b.id = tr.backup_id
      WHERE b.is_active = 1 AND b.user_id = ?
      GROUP BY b.id
      ORDER BY b.upload_date DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        backups: backups.rows,
        count: backups.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get backup by ID
 * GET /api/backups/:id
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const backups = await query(`
      SELECT 
        b.*,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM backups b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ? AND b.is_active = 1 AND b.user_id = ?
    `, [id, req.user.id]);
    
    if (backups.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Get test runs for this backup
    const testRuns = await query(`
      SELECT id, status, started_at, completed_at, duration_seconds, error_message
      FROM test_runs 
      WHERE backup_id = ?
      ORDER BY started_at DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        backup: backups.rows[0],
        testRuns: testRuns.rows
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Delete backup
 * DELETE /api/backups/:id
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get backup file path first (ensure user owns it)
    const backups = await query('SELECT file_path FROM backups WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    if (backups.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Soft delete (set is_active = 0)
    await query('UPDATE backups SET is_active = 0 WHERE id = ?', [id]);
    
    // Optionally delete physical file
    try {
      await fs.unlink(backups.rows[0].file_path);
    } catch (unlinkError) {
      console.warn('Could not delete physical backup file:', unlinkError.message);
    }
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
