const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const ResultStorage = require('../services/result-storage');
const StorageService = require('../services/storage-service');
const RailwayValidator = require('../services/railway-validator');
const settingsService = require('../services/settings-service');
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

// Create file filter function with settings
const createFileFilter = async () => {
  let allowedTypes;
  try {
    allowedTypes = await settingsService.getAllowedFileTypes();
  } catch (error) {
    console.warn('Failed to get allowed file types from settings, using defaults:', error);
    allowedTypes = ['sql', 'dump', 'backup']; // defaults
  }
  
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1); // Remove the dot
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      const error = new Error(`Invalid file type. Only ${allowedTypes.map(t => '.' + t).join(', ')} files are allowed`);
      error.statusCode = 400;
      cb(error);
    }
  };
};

// Create dynamic multer configuration
const createUploadMiddleware = async () => {
  try {
    const [maxFileSize, fileFilter] = await Promise.all([
      settingsService.getMaxFileSize(),
      createFileFilter()
    ]);
    
    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize * 1024 * 1024 // Convert MB to bytes
      }
    });
  } catch (error) {
    console.warn('Failed to get settings, using defaults:', error);
    const defaultFileFilter = await createFileFilter(); // This will use defaults
    return multer({
      storage,
      fileFilter: defaultFileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB default
      }
    });
  }
};

/**
 * Upload backup file
 * POST /api/backups/upload
 */
router.post('/upload', authenticateToken, async (req, res, next) => {
  // Create upload middleware with current settings
  const upload = await createUploadMiddleware();
  
  // Use the middleware
  upload.single('backup')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSize = await settingsService.getMaxFileSize().catch(() => 100);
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSize}MB`
        });
      }
      return next(err);
    }
    
    // Continue with upload logic
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
    
    // Save backup record to database (let database generate UUID)
    const result = await query(`
      INSERT INTO backups (user_id, file_name, file_path, file_size, file_type, database_name, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      userId,
      req.file.originalname,
      req.file.path,
      req.file.size,
      fileType,
      databaseName || null,
      description || null
    ]);
    
    const backupId = result.rows[0].id;

    // Create a test run record
    const testRunId = await ResultStorage.createTestRun({
      backupId,
      userId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      status: 'pending'
    });

    // Run direct validation
    console.log('🔄 Starting backup validation...');
    
    // Initialize validation result
    let validationResult = null;
    
    try {
      // Update test run to running
      await ResultStorage.updateTestRun(testRunId, {
        status: 'running',
        started_at: new Date()
      });
      
      // Use proper SQL validation regardless of environment
      if (process.env.USE_POSTGRESQL === 'true') {
        // Use PostgreSQL validator for actual PostgreSQL databases
        const validator = new RailwayValidator();
        validationResult = await validator.validateBackup(req.file.path, req.file.originalname);
      } else {
        // For SQLite environments, use SQLite-compatible SQL validator
        const SQLiteValidator = require('../services/sqlite-validator');
        const validator = new SQLiteValidator();
        validationResult = await validator.validateBackup(req.file.path, req.file.originalname);
      }
      
      // Update test run with results
      await ResultStorage.updateTestRun(testRunId, {
        status: validationResult.success ? 'passed' : 'failed',
        completed_at: new Date(),
        duration_seconds: validationResult.stats?.duration ? Math.round(validationResult.stats.duration / 1000) : 0,
        error_message: validationResult.errors?.length > 0 ? validationResult.errors.join('; ') : null
      });

      // Store detailed results for reporting
      const { query } = require('../db');
      
      // Store file validation stage
      await query(`
        INSERT INTO test_results (test_run_id, test_type, status, expected_value, actual_value, error_details, execution_time_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testRunId, 'File Validation', validationResult.stages.fileValidation.success ? 'passed' : 'failed', 'Valid file', validationResult.stages.fileValidation.success ? 'Found' : 'Invalid', validationResult.stages.fileValidation.error || null, validationResult.stages.fileValidation.duration || 0]);
      
      // Store backup restore stage
      await query(`
        INSERT INTO test_results (test_run_id, test_type, status, expected_value, actual_value, error_details, execution_time_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testRunId, 'Backup Restore', validationResult.stages.backupRestore.success ? 'passed' : 'failed', 'Successful restore', validationResult.stages.backupRestore.success ? `${validationResult.validationDetails.tablesCreated} tables created` : 'Failed', validationResult.stages.backupRestore.error || null, validationResult.stages.backupRestore.duration || 0]);
      
      // Store data validation stage
      await query(`
        INSERT INTO test_results (test_run_id, test_type, status, expected_value, actual_value, error_details, execution_time_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testRunId, 'Data Validation', validationResult.stages.dataValidation.success ? 'passed' : 'failed', 'Valid data integrity', validationResult.stages.dataValidation.success ? `${validationResult.validationDetails.tablesFound || 0} tables validated` : 'Failed', validationResult.stages.dataValidation.error || null, validationResult.stages.dataValidation.duration || 0]);

      console.log(`✅ Validation completed: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
      
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      
      // Update test run with error
      await ResultStorage.updateTestRun(testRunId, {
        status: 'failed',
        error_message: validationError.message,
        completed_at: new Date(),
        duration_seconds: 0
      });
    }
    
    const responseMessage = validationResult && validationResult.success ? 
      'Backup uploaded and validated successfully!' : 
      'Backup uploaded but validation failed!';
    
    const responseData = {
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
        status: validationResult && validationResult.success ? 'passed' : 'failed'
      }
    };
    
    // Add validation details if available
    if (validationResult) {
      responseData.validation = {
        success: validationResult.success,
        errors: validationResult.validationDetails.errorsFound,
        warnings: validationResult.validationDetails.warningsFound
      };
    }
    
    res.status(201).json({
      success: true,
      message: responseMessage,
      data: responseData
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
      WHERE b.is_active = 1 AND b.user_id = $1
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
      WHERE b.id = $1 AND b.is_active = 1 AND b.user_id = $2
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
      WHERE backup_id = $1
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
    const backups = await query('SELECT file_path FROM backups WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (backups.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
    
    // Soft delete (set is_active = 0)
    await query('UPDATE backups SET is_active = 0 WHERE id = $1', [id]);
    
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
