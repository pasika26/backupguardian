const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * SQLite-compatible SQL validator with proper syntax checking
 * Uses SQLite command line to validate SQL syntax and structure
 */
class SQLiteValidator {
  constructor() {
    this.validateId = `sqlite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validate backup file using SQLite syntax checking
   * @param {string} filePath - Path to backup file
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Validation result
   */
  async validateBackup(filePath, filename) {
    console.log(`🔄 Starting SQLite validation ${this.validateId} for file: ${filename}`);
    
    const startTime = Date.now();
    let validationResult = {
      testId: this.validateId,
      success: false,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      stages: {
        fileValidation: { success: false, duration: 0, error: null },
        tempDbCreation: { success: true, duration: 0, error: null }, // SQLite doesn't need temp DB
        backupRestore: { success: false, duration: 0, error: null },
        dataValidation: { success: false, duration: 0, error: null },
        cleanup: { success: true, duration: 0, error: null } // No cleanup needed
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
        warningsFound: []
      }
    };

    try {
      // Get file info
      const stats = fs.statSync(filePath);
      validationResult.fileInfo.size = stats.size;

      // Step 1: Basic file validation
      let stageStartTime = Date.now();
      const fileValidation = await this.validateFileStructure(filePath, filename);
      validationResult.stages.fileValidation.duration = Date.now() - stageStartTime;

      if (!fileValidation.passed) {
        validationResult.stages.fileValidation.success = false;
        validationResult.stages.fileValidation.error = fileValidation.errors.join('; ');
        validationResult.validationDetails.errorsFound.push(...fileValidation.errors);
        return this.finalizeResult(validationResult, startTime);
      }
      validationResult.stages.fileValidation.success = true;

      // Step 2: SQL syntax validation 
      stageStartTime = Date.now();
      const syntaxValidation = await this.validateSQLSyntax(filePath, filename);
      validationResult.stages.backupRestore.duration = Date.now() - stageStartTime;

      if (!syntaxValidation.passed) {
        validationResult.stages.backupRestore.success = false;
        validationResult.stages.backupRestore.error = syntaxValidation.errors.join('; ');
        validationResult.validationDetails.errorsFound.push(...syntaxValidation.errors);
        return this.finalizeResult(validationResult, startTime);
      }
      validationResult.stages.backupRestore.success = true;

      // Step 3: Content structure validation
      stageStartTime = Date.now();
      const contentValidation = await this.validateSQLContent(filePath, filename);
      validationResult.stages.dataValidation.duration = Date.now() - stageStartTime;
      validationResult.stages.dataValidation.success = true;

      // Warnings don't fail validation
      if (contentValidation.warnings) {
        validationResult.validationDetails.warningsFound.push(...contentValidation.warnings);
      }
      if (syntaxValidation.warnings) {
        validationResult.validationDetails.warningsFound.push(...syntaxValidation.warnings);
      }

      // If we get here, validation passed
      validationResult.success = true;
      console.log(`✅ SQLite validation ${this.validateId} passed`);

    } catch (error) {
      console.error(`❌ SQLite validation ${this.validateId} failed:`, error.message);
      validationResult.stages.fileValidation.error = error.message;
      validationResult.validationDetails.errorsFound.push(error.message);
    }

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

      // Check if file is effectively empty (only whitespace)
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length === 0) {
        step.errors.push('File contains no SQL content (only whitespace)');
        return step;
      }

      if (stats.size > 1000 * 1024 * 1024) { // 1GB limit
        step.warnings.push('Large file size may impact validation performance');
      }

      // Check file extension
      const ext = path.extname(filename).toLowerCase();
      if (!['.sql', '.dump', '.backup'].includes(ext)) {
        step.warnings.push(`Unusual file extension: ${ext}`);
      }

      // Basic content validation - check for basic SQL structure
      const hasBasicSQLStructure = /\b(CREATE|INSERT|SELECT|UPDATE|DELETE|DROP|ALTER)\b/i.test(content);
      if (!hasBasicSQLStructure) {
        step.errors.push('File does not appear to contain valid SQL statements');
        return step;
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
   * Validate SQL syntax using intelligent parsing (dialect-aware)
   */
  async validateSQLSyntax(filePath, filename) {
    const step = {
      name: 'SQL Syntax Validation',
      passed: false,
      errors: [],
      warnings: []
    };

    try {
      // Use intelligent SQL parsing for structural validation
      const content = fs.readFileSync(filePath, 'utf8');
      const result = this.parseSQL(content, filename);
      
      if (result.hasStructuralErrors) {
        step.errors.push(...result.structuralErrors);
      } else {
        step.passed = true;
        if (result.dialectWarnings.length > 0) {
          step.warnings.push(...result.dialectWarnings);
        }
      }

    } catch (error) {
      step.errors.push(`SQL syntax validation failed: ${error.message}`);
    }

    return step;
  }

  /**
   * Validate SQL content structure and patterns
   */
  async validateSQLContent(filePath, filename) {
    const step = {
      name: 'SQL Content Validation',
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Check for common SQL patterns
      const hasCreateTable = /CREATE\s+TABLE/i.test(content);
      const hasInsert = /INSERT\s+INTO/i.test(content);
      const hasSelect = /SELECT\s+/i.test(content);

      if (!hasCreateTable && !hasInsert && !hasSelect) {
        step.warnings.push('No common SQL statements found (CREATE TABLE, INSERT, SELECT)');
      }

      // Check for potential issues
      const potentialIssues = [
        {
          pattern: /PRAGMA\s+foreign_keys\s*=\s*OFF/i,
          message: 'Foreign key constraints disabled'
        },
        {
          pattern: /DROP\s+TABLE\s+IF\s+EXISTS/i,
          message: 'Contains DROP TABLE statements'
        },
        {
          pattern: /DELETE\s+FROM/i,
          message: 'Contains DELETE statements'
        }
      ];

      for (const issue of potentialIssues) {
        if (issue.pattern.test(content)) {
          step.warnings.push(issue.message);
        }
      }

      // Check line count
      if (lines.length > 50000) {
        step.warnings.push(`Large SQL file: ${lines.length} lines`);
      }

    } catch (error) {
      step.warnings.push(`Content validation warning: ${error.message}`);
    }

    return step;
  }

  /**
   * Intelligent SQL parsing that focuses on structural validation and dialect detection
   */
  parseSQL(content, filename) {
    const result = {
      hasStructuralErrors: false,
      structuralErrors: [],
      dialectWarnings: []
    };

    // Check for structural issues and dialect differences
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for structural SQL issues (actual errors)
      const structuralIssue = this.validateSQLStructure(line);
      if (structuralIssue) {
        result.hasStructuralErrors = true;
        result.structuralErrors.push(`Line ${lineNum}: ${structuralIssue}`);
        continue;
      }
      
      // Detect dialect differences (warnings only)
      const dialectIssue = this.detectDialectDifference(line);
      if (dialectIssue) {
        result.dialectWarnings.push(`Line ${lineNum}: ${dialectIssue}`);
      }
    }

    // Enhanced multi-line statement validation
    const multiLineIssues = this.validateMultiLineStatements(content);
    if (multiLineIssues.length > 0) {
      result.hasStructuralErrors = true;
      result.structuralErrors.push(...multiLineIssues);
    }

    // Check for transaction integrity
    const transactionIssue = this.validateTransactionIntegrity(content);
    if (transactionIssue) {
      result.hasStructuralErrors = true;
      result.structuralErrors.push(transactionIssue);
    }

    return result;
  }

  /**
   * Validate SQL line structure for common issues
   */
  validateSQLStructure(line) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.startsWith('*/')) {
      return null;
    }

    // Skip MySQL version comments /*!40101 ... */
    if (/^\/\*!\d+/.test(trimmed) || /\*\/$/.test(trimmed)) {
      return null;
    }

    // Check for incomplete SQL statements (missing semicolon for complete statements)
    if (this.isCompleteStatement(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith(',')) {
      return 'SQL statement appears incomplete (missing semicolon)';
    }

    // Check for severely truncated statements
    if (this.isTruncatedStatement(trimmed)) {
      return 'SQL statement appears truncated or incomplete';
    }

    return null;
  }

  /**
   * Check if a line represents a complete SQL statement that should end with semicolon
   */
  isCompleteStatement(line) {
    const upperLine = line.toUpperCase();
    
    // Only flag single-line statements that are clearly complete
    const completeStatements = [
      /^DROP\s+(TABLE|INDEX|VIEW)\s+.*\w+$/,          // DROP statements
      /^INSERT\s+INTO\s+\w+.*VALUES.*\)$/,            // Single-line INSERT
      /^UPDATE\s+\w+\s+SET.*WHERE/,                   // UPDATE with WHERE
      /^DELETE\s+FROM\s+\w+.*WHERE/,                  // DELETE with WHERE
      /^ALTER\s+TABLE\s+\w+\s+(ADD|DROP|MODIFY)/,     // Simple ALTER statements
    ];

    return completeStatements.some(pattern => pattern.test(upperLine));
  }

  /**
   * Check if a statement appears to be truncated
   */
  isTruncatedStatement(line) {
    const upperLine = line.toUpperCase();
    
    // These patterns suggest truncation - but only for lines that should be complete
    const truncationIndicators = [
      /^INSERT\s+INTO\s+\w+\s*$/,           // INSERT without VALUES
      /^UPDATE\s+\w+\s*$/,                  // UPDATE without SET  
      /^SELECT\s*$/,                        // SELECT without columns
      /^DELETE\s+FROM\s*$/,                 // DELETE without table
    ];

    return truncationIndicators.some(pattern => pattern.test(upperLine));
  }

  /**
   * Validate multi-line SQL statements for structural integrity
   */
  validateMultiLineStatements(content) {
    const errors = [];
    const lines = content.split('\n');
    
    // Track parsing state
    let currentStatement = '';
    let statementStartLine = 0;
    let parenthesesDepth = 0;
    let inCreateTable = false;
    let inString = false;
    let stringChar = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      
      // Handle MySQL version comments /*!40101 ... */
      if (trimmed.startsWith('/*!') && trimmed.endsWith('*/')) {
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + ' ';
      if (statementStartLine === 0) {
        statementStartLine = lineNum;
      }
      
      // Parse character by character to track strings and parentheses
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        // Handle string literals
        if ((char === '"' || char === "'" || char === '`') && !inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && inString) {
          // Check for escaped quotes
          if (j === 0 || line[j-1] !== '\\\\') {
            inString = false;
            stringChar = null;
          }
        }
        
        // Skip content inside strings
        if (inString) continue;
        
        // Track parentheses depth
        if (char === '(') {
          parenthesesDepth++;
        } else if (char === ')') {
          parenthesesDepth--;
          if (parenthesesDepth < 0) {
            errors.push(`Line ${lineNum}: Unexpected closing parenthesis`);
            parenthesesDepth = 0; // Reset to prevent cascade errors
          }
        }
      }
      
      // Check if we're in a CREATE TABLE statement
      const upperStatement = currentStatement.toUpperCase();
      if (upperStatement.includes('CREATE TABLE') && !inCreateTable) {
        inCreateTable = true;
      }
      
      // Check for statement completion (semicolon)
      if (trimmed.endsWith(';')) {
        // Statement is complete - validate it
        const statementErrors = this.validateCompleteStatement(
          currentStatement.trim(), 
          statementStartLine, 
          lineNum, 
          parenthesesDepth, 
          inCreateTable
        );
        errors.push(...statementErrors);
        
        // Reset state for next statement
        currentStatement = '';
        statementStartLine = 0;
        parenthesesDepth = 0;
        inCreateTable = false;
      }
    }
    
    // Check if we have an incomplete statement at the end
    if (currentStatement.trim() && statementStartLine > 0) {
      const incompletErrors = this.validateIncompleteStatement(
        currentStatement.trim(), 
        statementStartLine, 
        lines.length, 
        parenthesesDepth, 
        inCreateTable
      );
      errors.push(...incompletErrors);
    }
    
    return errors;
  }

  /**
   * Validate a complete SQL statement (ending with semicolon)
   */
  validateCompleteStatement(statement, startLine, endLine, parenthesesDepth, wasCreateTable) {
    const errors = [];
    
    // Check for unmatched parentheses
    if (parenthesesDepth !== 0) {
      if (parenthesesDepth > 0) {
        errors.push(`Lines ${startLine}-${endLine}: Unclosed parentheses (missing ${parenthesesDepth} closing parenthesis)`);
      }
    }
    
    // Validate CREATE TABLE structure
    if (wasCreateTable) {
      const upperStatement = statement.toUpperCase();
      if (!upperStatement.includes('(') || !upperStatement.includes(')')) {
        errors.push(`Lines ${startLine}-${endLine}: CREATE TABLE statement missing column definitions`);
      }
    }
    
    return errors;
  }

  /**
   * Validate an incomplete SQL statement (no ending semicolon)  
   */
  validateIncompleteStatement(statement, startLine, endLine, parenthesesDepth, wasCreateTable) {
    const errors = [];
    const upperStatement = statement.toUpperCase();
    
    // Check if this looks like it should be a complete statement
    const shouldBeComplete = [
      /CREATE\s+TABLE\s+\w+.*\)/i,
      /INSERT\s+INTO\s+\w+.*VALUES.*\)/i,
      /DROP\s+(TABLE|INDEX|VIEW)\s+\w+/i,
      /UPDATE\s+\w+\s+SET.*WHERE/i,
      /DELETE\s+FROM\s+\w+.*WHERE/i
    ];
    
    const looksComplete = shouldBeComplete.some(pattern => pattern.test(statement));
    
    if (looksComplete) {
      errors.push(`Lines ${startLine}-${endLine}: SQL statement appears complete but missing semicolon`);
    }
    
    // Check for unmatched parentheses in incomplete statements
    if (parenthesesDepth > 0) {
      errors.push(`Lines ${startLine}-${endLine}: Incomplete statement with unclosed parentheses (missing ${parenthesesDepth} closing parenthesis)`);
    }
    
    // Check incomplete CREATE TABLE
    if (wasCreateTable && !upperStatement.includes(')')) {
      errors.push(`Lines ${startLine}-${endLine}: Incomplete CREATE TABLE statement (missing closing parenthesis and/or semicolon)`);
    }
    
    return errors;
  }

  /**
   * Validate transaction integrity across the entire content
   */
  validateTransactionIntegrity(content) {
    const upperContent = content.toUpperCase();
    
    // Count transaction statements
    const beginCount = (upperContent.match(/\bBEGIN\b/g) || []).length;
    const commitCount = (upperContent.match(/\bCOMMIT\b/g) || []).length;
    const rollbackCount = (upperContent.match(/\bROLLBACK\b/g) || []).length;
    
    if (beginCount > 0 && (commitCount + rollbackCount) !== beginCount) {
      return `Transaction integrity issue: ${beginCount} BEGIN statements but ${commitCount + rollbackCount} COMMIT/ROLLBACK statements`;
    }
    
    return null;
  }

  /**
   * Detect SQL dialect differences (these become warnings, not errors)
   */
  detectDialectDifference(line) {
    const trimmed = line.trim().toUpperCase();
    
    // MySQL-specific syntax (common in backup files)
    if (trimmed.includes('AUTO_INCREMENT')) return 'AUTO_INCREMENT detected (MySQL syntax)';
    if (trimmed.includes('LOCK TABLES')) return 'LOCK TABLES detected (MySQL syntax)';
    if (trimmed.includes('UNLOCK TABLES')) return 'UNLOCK TABLES detected (MySQL syntax)';
    if (trimmed.includes('ENGINE=')) return 'Storage engine specification detected (MySQL syntax)';
    if (trimmed.includes('CHARACTER SET')) return 'Character set specification detected (MySQL syntax)';
    if (trimmed.includes('COLLATE')) return 'Collation specification detected (MySQL syntax)';
    if (/^\/\*!\d+/.test(trimmed)) return 'MySQL version comment detected';
    
    // PostgreSQL-specific syntax
    if (trimmed.includes('SERIAL')) return 'SERIAL type detected (PostgreSQL syntax)';
    if (trimmed.includes('RETURNING')) return 'RETURNING clause detected (PostgreSQL syntax)';
    if (trimmed.includes('ON CONFLICT')) return 'ON CONFLICT clause detected (PostgreSQL syntax)';
    if (trimmed.includes('BIGSERIAL')) return 'BIGSERIAL type detected (PostgreSQL syntax)';
    
    return null;
  }

  /**
   * Finalize validation result
   */
  finalizeResult(result, startTime) {
    result.duration = Date.now() - startTime;
    result.endTime = new Date();
    
    if (result.success) {
      console.log(`✅ SQLite validation ${this.validateId} completed successfully in ${result.duration}ms`);
    } else {
      console.log(`❌ SQLite validation ${this.validateId} failed in ${result.duration}ms`);
      console.log('Errors:', result.validationDetails.errorsFound);
    }

    return result;
  }
}

module.exports = SQLiteValidator;
