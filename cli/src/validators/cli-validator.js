const fs = require('fs');
const path = require('path');

/**
 * CLI-specific validator that extends web validation with binary corruption detection
 * Uses direct file system access to preserve all binary data
 */
class CLIValidator {
  constructor() {
    this.validateId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validate backup file with CLI-specific capabilities
   * @param {string} filePath - Path to backup file
   * @param {string} filename - Original filename
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateBackup(filePath, filename, options = {}) {
    console.log(`🔄 Starting CLI validation ${this.validateId} for file: ${filename}`);
    
    const startTime = Date.now();
    let validationResult = {
      testId: this.validateId,
      success: false,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      stages: {
        fileValidation: { success: false, duration: 0, error: null },
        binaryIntegrityCheck: { success: false, duration: 0, error: null },
        structuralValidation: { success: false, duration: 0, error: null },
        dialectDetection: { success: true, duration: 0, error: null }
      },
      fileInfo: {
        path: filePath,
        name: filename,
        size: 0,
        type: 'sql'
      },
      validationDetails: {
        tablesCreated: 0,
        rowsInserted: 0,
        constraintsChecked: 0,
        errorsFound: [],
        warningsFound: [],
        dialectWarnings: []
      }
    };

    try {
      // Get file info
      const stats = fs.statSync(filePath);
      validationResult.fileInfo.size = stats.size;

      // Stage 1: Basic file validation
      let stageStartTime = Date.now();
      const fileValidation = await this.validateFileStructure(filePath, filename);
      validationResult.stages.fileValidation.duration = Date.now() - stageStartTime;

      if (!fileValidation.passed) {
        validationResult.stages.fileValidation.success = false;
        validationResult.stages.fileValidation.error = fileValidation.errors.join('; ');
        validationResult.validationDetails.errorsFound.push(...fileValidation.errors);
        
        // Calculate confidence metrics even for early failures
        validationResult.confidenceMetrics = this.calculateConfidenceMetrics(validationResult);
        return this.finalizeResult(validationResult, startTime);
      }
      validationResult.stages.fileValidation.success = true;

      // Stage 2: Binary integrity check (CLI-specific capability)
      stageStartTime = Date.now();
      const binaryValidation = await this.validateBinaryIntegrity(filePath, filename);
      validationResult.stages.binaryIntegrityCheck.duration = Date.now() - stageStartTime;

      if (!binaryValidation.passed) {
        validationResult.stages.binaryIntegrityCheck.success = false;
        validationResult.stages.binaryIntegrityCheck.error = binaryValidation.errors.join('; ');
        validationResult.validationDetails.errorsFound.push(...binaryValidation.errors);
        
        // Calculate confidence metrics even for binary failures
        validationResult.confidenceMetrics = this.calculateConfidenceMetrics(validationResult);
        return this.finalizeResult(validationResult, startTime);
      }
      validationResult.stages.binaryIntegrityCheck.success = true;

      // Stage 3: Structural SQL validation 
      stageStartTime = Date.now();
      const structuralValidation = await this.validateSQLStructure(filePath, filename);
      validationResult.stages.structuralValidation.duration = Date.now() - stageStartTime;

      if (!structuralValidation.passed) {
        validationResult.stages.structuralValidation.success = false;
        validationResult.stages.structuralValidation.error = structuralValidation.errors.join('; ');
        validationResult.validationDetails.errorsFound.push(...structuralValidation.errors);
        
        // Calculate confidence metrics even for structural failures
        validationResult.confidenceMetrics = this.calculateConfidenceMetrics(validationResult);
        return this.finalizeResult(validationResult, startTime);
      }
      validationResult.stages.structuralValidation.success = true;

      // Collect warnings from all stages
      if (fileValidation.warnings) {
        validationResult.validationDetails.warningsFound.push(...fileValidation.warnings);
      }
      if (structuralValidation.warnings) {
        validationResult.validationDetails.warningsFound.push(...structuralValidation.warnings);
      }
      if (structuralValidation.dialectWarnings) {
        validationResult.validationDetails.dialectWarnings.push(...structuralValidation.dialectWarnings);
      }

      // If we get here, validation passed
      validationResult.success = true;
      console.log(`✅ CLI validation ${this.validateId} passed`);

    } catch (error) {
      console.error(`❌ CLI validation ${this.validateId} failed:`, error.message);
      validationResult.stages.fileValidation.error = error.message;
      validationResult.validationDetails.errorsFound.push(error.message);
    }

    // Always calculate confidence metrics (for both success and failure)
    validationResult.confidenceMetrics = this.calculateConfidenceMetrics(validationResult);

    return this.finalizeResult(validationResult, startTime);
  }

  /**
   * Validate basic file structure and readability
   */
  async validateFileStructure(filePath, filename) {
    const step = {
      name: 'File Structure Validation',
      passed: false,
      errors: [],
      warnings: []
    };

    try {
      // Check file exists and is readable
      const stats = fs.statSync(filePath);
      
      if (stats.size === 0) {
        step.errors.push('File is empty');
        return step;
      }

      if (stats.size > 2000 * 1024 * 1024) { // 2GB limit for CLI
        step.warnings.push('Very large file size may impact validation performance');
      }

      // Check file extension
      const ext = path.extname(filename).toLowerCase();
      if (!['.sql', '.dump', '.backup'].includes(ext)) {
        step.warnings.push(`Unusual file extension: ${ext}`);
      }

      step.passed = true;

    } catch (error) {
      if (error.code === 'ENOENT') {
        step.errors.push('File not found');
      } else {
        step.errors.push(`File read error: ${error.message}`);
      }
    }

    return step;
  }

  /**
   * Binary integrity check - CLI-specific capability
   * Can detect actual binary corruption that survives file system operations
   */
  async validateBinaryIntegrity(filePath, filename) {
    const step = {
      name: 'Binary Integrity Check',
      passed: false,
      errors: [],
      warnings: []
    };

    try {
      // Read file as buffer to preserve binary data
      const buffer = fs.readFileSync(filePath);
      const content = buffer.toString('utf8');

      // Check for actual binary corruption patterns
      const corruptionIssues = this.detectBinaryCorruption(content, buffer);
      
      if (corruptionIssues.length > 0) {
        step.errors.push(...corruptionIssues);
        return step;
      }

      // Check file appears to contain SQL
      const hasBasicSQLStructure = /\b(CREATE|INSERT|SELECT|UPDATE|DELETE|DROP|ALTER)\b/i.test(content);
      if (!hasBasicSQLStructure) {
        step.errors.push('File does not appear to contain valid SQL statements');
        return step;
      }

      // Check for encoding issues
      const encodingIssues = this.detectEncodingIssues(content);
      if (encodingIssues.length > 0) {
        step.warnings.push(...encodingIssues);
      }

      step.passed = true;

    } catch (error) {
      step.errors.push(`Binary integrity check failed: ${error.message}`);
    }

    return step;
  }

  /**
   * Detect actual binary corruption in file content
   */
  detectBinaryCorruption(content, buffer) {
    const issues = [];

    // Check for null bytes (strong indicator of binary corruption)
    const nullByteCount = (content.match(/\0/g) || []).length;
    if (nullByteCount > 0) {
      issues.push(`File contains ${nullByteCount} null bytes (binary corruption detected)`);
    }

    // Check for Unicode replacement characters (indicates encoding corruption)
    const replacementCharCount = (content.match(/\uFFFD/g) || []).length;
    if (replacementCharCount > 0) {
      issues.push(`File contains ${replacementCharCount} Unicode replacement characters (encoding corruption detected)`);
    }

    // Check for actual binary corruption markers that CLI can detect
    const binaryPatterns = [
      { pattern: /���+/, name: 'binary corruption markers' },
      { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/, name: 'control characters in SQL context' }
    ];

    for (const { pattern, name } of binaryPatterns) {
      const matches = content.match(new RegExp(pattern.source, 'g'));
      if (matches && matches.length > 0) {
        // Additional check: make sure this isn't in a valid SQL context
        const lines = content.split('\n');
        let corruptionInSQL = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (pattern.test(line)) {
            // Skip if in comments
            const trimmed = line.trim();
            if (trimmed.startsWith('--') || trimmed.startsWith('/*')) {
              continue;
            }
            corruptionInSQL = true;
            break;
          }
        }
        
        if (corruptionInSQL) {
          issues.push(`File contains ${name} in SQL statements (binary corruption detected)`);
        }
      }
    }

    // Check for severely truncated file (buffer much larger than readable content)
    const readableRatio = content.length / buffer.length;
    if (readableRatio < 0.5) {
      issues.push('File appears to be severely corrupted (large amount of unreadable content)');
    }

    return issues;
  }

  /**
   * Detect encoding issues
   */
  detectEncodingIssues(content) {
    const issues = [];

    // Check for mixed encoding indicators
    if (/[^\x00-\x7F]/.test(content) && !/[\u00A1-\uFFFF]/.test(content)) {
      issues.push('File may have encoding issues (non-ASCII characters detected)');
    }

    // Check for byte order mark issues
    if (content.charCodeAt(0) === 0xFEFF) {
      issues.push('File contains BOM (Byte Order Mark) - may cause parsing issues');
    }

    return issues;
  }

  /**
   * Validate SQL structure using enhanced logic from web validator
   */
  async validateSQLStructure(filePath, filename) {
    const step = {
      name: 'SQL Structure Validation',
      passed: false,
      errors: [],
      warnings: [],
      dialectWarnings: []
    };

    try {
      // Import and use the enhanced SQLiteValidator logic
      const SQLiteValidator = require('../../../backend/src/services/sqlite-validator');
      const webValidator = new SQLiteValidator();

      // Use the web validator's parseSQL method for structural validation
      const content = fs.readFileSync(filePath, 'utf8');
      const result = webValidator.parseSQL(content, filename);
      
      if (result.hasStructuralErrors) {
        step.errors.push(...result.structuralErrors);
      } else {
        step.passed = true;
        if (result.dialectWarnings.length > 0) {
          step.dialectWarnings.push(...result.dialectWarnings);
        }
      }

      // Add CLI-specific additional checks
      const transactionIssue = webValidator.validateTransactionIntegrity(content);
      if (transactionIssue) {
        step.errors.push(transactionIssue);
        step.passed = false;
      }

    } catch (error) {
      step.errors.push(`SQL structure validation failed: ${error.message}`);
    }

    return step;
  }

  /**
   * Calculate confidence metrics for MVP reporting
   */
  calculateConfidenceMetrics(result) {
    const metrics = {
      scores: {
        fileIntegrity: 0,
        sqlStructure: 0, 
        dataCompleteness: 0,
        compatibility: 0,
        total: 0
      },
      confidenceLevel: 'UNKNOWN',
      riskLevel: 'UNKNOWN',
      databaseCompatibility: {
        mysql: 'unknown',
        postgresql: 'unknown', 
        sqlite: 'unknown'
      },
      actionItems: [],
      summary: ''
    };

    // Score: File Integrity (25 points)
    if (result.stages.fileValidation.success && result.stages.binaryIntegrityCheck.success) {
      metrics.scores.fileIntegrity = 25;
    } else if (result.stages.fileValidation.success) {
      metrics.scores.fileIntegrity = 15; // File exists but has integrity issues
    }

    // Score: SQL Structure (25 points)  
    if (result.stages.structuralValidation.success) {
      metrics.scores.sqlStructure = result.validationDetails.errorsFound.length === 0 ? 25 : 20;
    } else {
      metrics.scores.sqlStructure = 5; // Some structure detected but issues found
    }

    // Score: Data Completeness (25 points)
    // Base on transaction integrity and overall success
    if (result.success) {
      metrics.scores.dataCompleteness = 25;
    } else if (result.stages.fileValidation.success) {
      metrics.scores.dataCompleteness = 15; // File readable but incomplete
    } else {
      metrics.scores.dataCompleteness = 0;
    }

    // Score: Compatibility (25 points)
    const dialectWarnings = result.validationDetails.dialectWarnings || [];
    const mysqlFeatures = dialectWarnings.filter(w => w.includes('MySQL')).length;
    const postgresFeatures = dialectWarnings.filter(w => w.includes('PostgreSQL')).length;
    
    if (dialectWarnings.length === 0) {
      metrics.scores.compatibility = 25; // Standard SQL
    } else if (dialectWarnings.length <= 5) {
      metrics.scores.compatibility = 20; // Minor dialect issues
    } else if (dialectWarnings.length <= 15) {
      metrics.scores.compatibility = 15; // Moderate dialect issues
    } else {
      metrics.scores.compatibility = 10; // Heavy dialect usage
    }

    // Calculate total
    metrics.scores.total = metrics.scores.fileIntegrity + 
                          metrics.scores.sqlStructure + 
                          metrics.scores.dataCompleteness + 
                          metrics.scores.compatibility;

    // Determine confidence level
    if (metrics.scores.total >= 90) {
      metrics.confidenceLevel = 'HIGH';
    } else if (metrics.scores.total >= 70) {
      metrics.confidenceLevel = 'MEDIUM';
    } else if (metrics.scores.total >= 50) {
      metrics.confidenceLevel = 'LOW';
    } else {
      metrics.confidenceLevel = 'VERY LOW';
    }

    // Determine risk level
    if (result.success && dialectWarnings.length <= 5) {
      metrics.riskLevel = 'LOW';
    } else if (result.success && dialectWarnings.length <= 15) {
      metrics.riskLevel = 'LOW-MEDIUM';
    } else if (result.success) {
      metrics.riskLevel = 'MEDIUM';
    } else {
      metrics.riskLevel = 'HIGH';
    }

    // Database compatibility
    if (mysqlFeatures > 0 || dialectWarnings.some(w => w.includes('AUTO_INCREMENT'))) {
      metrics.databaseCompatibility.mysql = 'ready';
      metrics.databaseCompatibility.postgresql = 'review';
      metrics.databaseCompatibility.sqlite = 'review';
    } else if (postgresFeatures > 0) {
      metrics.databaseCompatibility.postgresql = 'ready';
      metrics.databaseCompatibility.mysql = 'review';
      metrics.databaseCompatibility.sqlite = 'review';
    } else {
      // Standard SQL
      metrics.databaseCompatibility.mysql = 'ready';
      metrics.databaseCompatibility.postgresql = 'ready';
      metrics.databaseCompatibility.sqlite = 'ready';
    }

    // Generate action items
    if (result.success) {
      if (mysqlFeatures > 0) {
        metrics.actionItems.push('✅ Ready for MySQL restoration immediately');
        metrics.actionItems.push('⚠️  Convert AUTO_INCREMENT to SERIAL before PostgreSQL use');
      } else if (postgresFeatures > 0) {
        metrics.actionItems.push('✅ Ready for PostgreSQL restoration immediately'); 
        metrics.actionItems.push('⚠️  May need minor adjustments for MySQL compatibility');
      } else {
        metrics.actionItems.push('✅ Ready for restoration on any supported database');
      }
    } else {
      metrics.actionItems.push('❌ Fix validation errors before attempting restoration');
      if (result.stages.fileValidation.success) {
        metrics.actionItems.push('💡 File is readable - focus on SQL syntax issues');
      }
    }

    // Generate summary  
    if (result.success) {
      metrics.summary = `Your backup is ready for restoration with ${dialectWarnings.length > 5 ? 'some' : 'minor'} dialect considerations.`;
    } else {
      metrics.summary = 'Your backup has critical issues that must be resolved before restoration.';
    }

    // Override confidence level for failed validation
    if (!result.success) {
      if (result.stages.fileValidation.success) {
        metrics.confidenceLevel = 'LOW'; // File readable but has issues
      } else {
        metrics.confidenceLevel = 'VERY LOW'; // File not readable
      }
    }

    return metrics;
  }

  /**
   * Finalize validation result
   */
  finalizeResult(result, startTime) {
    result.duration = Date.now() - startTime;
    result.endTime = new Date();
    
    if (result.success) {
      console.log(`✅ CLI validation ${this.validateId} completed successfully in ${result.duration}ms`);
    } else {
      console.log(`❌ CLI validation ${this.validateId} failed in ${result.duration}ms`);
      console.log('Errors:', result.validationDetails.errorsFound);
    }

    return result;
  }
}

module.exports = CLIValidator;
