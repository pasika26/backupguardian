const PostgreSQLDatabase = require('./postgresql-database');
const MySQLDatabase = require('./mysql-database');
const path = require('path');

/**
 * Factory for creating database instances based on type or file analysis
 */
class DatabaseFactory {
  constructor() {
    this.databases = new Map([
      ['postgresql', PostgreSQLDatabase],
      ['postgres', PostgreSQLDatabase],
      ['pg', PostgreSQLDatabase],
      ['mysql', MySQLDatabase],
      ['mariadb', MySQLDatabase]
    ]);
  }

  /**
   * Create a database instance based on specified type
   * @param {string} databaseType - Database type identifier
   * @param {object} config - Database configuration
   * @returns {BaseDatabase}
   */
  createDatabase(databaseType, config = {}) {
    const type = databaseType.toLowerCase();
    const DatabaseClass = this.databases.get(type);
    
    if (!DatabaseClass) {
      throw new Error(`Unsupported database type: ${databaseType}. Supported types: ${Array.from(this.databases.keys()).join(', ')}`);
    }
    
    return new DatabaseClass(config);
  }

  /**
   * Create a database instance by analyzing the backup file
   * @param {string} backupFilePath - Path to the backup file
   * @param {object} config - Database configuration
   * @returns {BaseDatabase}
   */
  createDatabaseFromFile(backupFilePath, config = {}) {
    const fileExtension = path.extname(backupFilePath).toLowerCase();
    const fileName = path.basename(backupFilePath).toLowerCase();
    
    // Try to determine database type from file extension and name
    const databaseType = this.detectDatabaseType(fileExtension, fileName, backupFilePath);
    
    return this.createDatabase(databaseType, config);
  }

  /**
   * Create a database instance with automatic detection
   * @param {object} options - Options for database creation
   * @param {string} options.type - Explicit database type
   * @param {string} options.filePath - Backup file path for auto-detection
   * @param {string} options.fileContent - File content for analysis
   * @param {object} options.config - Database configuration
   * @returns {BaseDatabase}
   */
  createDatabaseAuto(options = {}) {
    const { type, filePath, fileContent, config = {} } = options;
    
    // If type is explicitly specified, use it
    if (type) {
      return this.createDatabase(type, config);
    }
    
    // If file path is provided, analyze the file
    if (filePath) {
      return this.createDatabaseFromFile(filePath, config);
    }
    
    // If file content is provided, analyze the content
    if (fileContent) {
      const detectedType = this.detectDatabaseTypeFromContent(fileContent);
      return this.createDatabase(detectedType, config);
    }
    
    // Default to PostgreSQL if no detection method available
    console.warn('No database type specified or detectable, defaulting to PostgreSQL');
    return this.createDatabase('postgresql', config);
  }

  /**
   * Detect database type from file extension and name
   * @private
   */
  detectDatabaseType(fileExtension, fileName, filePath) {
    // Check for obvious indicators in filename
    if (fileName.includes('postgres') || fileName.includes('pg_')) {
      return 'postgresql';
    }
    
    if (fileName.includes('mysql') || fileName.includes('mariadb')) {
      return 'mysql';
    }
    
    // Check file extension patterns
    switch (fileExtension) {
      case '.sql':
        // SQL files could be either - try to analyze content if possible
        return this.analyzeFileForDatabaseType(filePath);
        
      case '.dump':
      case '.backup':
        // These are typically PostgreSQL formats
        return 'postgresql';
        
      case '.mysqldump':
        return 'mysql';
        
      default:
        // Default to PostgreSQL for unknown extensions
        return 'postgresql';
    }
  }

  /**
   * Analyze file content to detect database type
   * @private
   */
  analyzeFileForDatabaseType(filePath) {
    try {
      const fs = require('fs');
      
      // Read first few KB of file to analyze
      const buffer = Buffer.alloc(8192);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      
      const content = buffer.toString('utf8', 0, bytesRead).toLowerCase();
      
      return this.detectDatabaseTypeFromContent(content);
    } catch (error) {
      console.warn(`Failed to analyze file ${filePath}: ${error.message}`);
      return 'postgresql'; // Default fallback
    }
  }

  /**
   * Detect database type from file content
   * @private
   */
  detectDatabaseTypeFromContent(content) {
    const contentLower = content.toLowerCase();
    
    // PostgreSQL indicators
    const pgIndicators = [
      'create database',
      'pg_dump',
      'pg_restore',
      'postgresql',
      'plpgsql',
      'serial primary key',
      'nextval(',
      'pg_catalog',
      'information_schema'
    ];
    
    // MySQL indicators
    const mysqlIndicators = [
      'mysqldump',
      'mysql',
      'auto_increment',
      'engine=',
      'charset=',
      'collate=',
      'use `',
      'show tables',
      'information_schema.tables'
    ];
    
    let pgScore = 0;
    let mysqlScore = 0;
    
    // Count indicators
    for (const indicator of pgIndicators) {
      if (contentLower.includes(indicator)) {
        pgScore++;
      }
    }
    
    for (const indicator of mysqlIndicators) {
      if (contentLower.includes(indicator)) {
        mysqlScore++;
      }
    }
    
    // Return the type with higher score
    if (mysqlScore > pgScore) {
      return 'mysql';
    } else {
      return 'postgresql'; // Default to PostgreSQL
    }
  }

  /**
   * Get all supported database types
   * @returns {Array<string>}
   */
  getSupportedTypes() {
    return Array.from(this.databases.keys());
  }

  /**
   * Check if a database type is supported
   * @param {string} databaseType - Database type to check
   * @returns {boolean}
   */
  isSupported(databaseType) {
    return this.databases.has(databaseType.toLowerCase());
  }

  /**
   * Get database configuration template for a specific type
   * @param {string} databaseType - Database type
   * @returns {object}
   */
  getConfigTemplate(databaseType) {
    const type = databaseType.toLowerCase();
    
    switch (type) {
      case 'postgresql':
      case 'postgres':
      case 'pg':
        return {
          image: 'postgres:15-alpine',
          port: 5432,
          user: 'testuser',
          database: 'testdb',
          password: 'testpass123',
          basePort: 5433
        };
        
      case 'mysql':
      case 'mariadb':
        return {
          image: 'mysql:8.0',
          port: 3306,
          user: 'testuser',
          database: 'testdb',
          password: 'testpass123',
          rootPassword: 'rootpass123',
          basePort: 3307
        };
        
      default:
        throw new Error(`No configuration template available for database type: ${databaseType}`);
    }
  }
}

module.exports = DatabaseFactory;
