/**
 * Configuration mapping for different database types
 * Centralizes database-specific settings and defaults
 */
class DatabaseConfig {
  constructor() {
    this.defaultConfigs = {
      postgresql: {
        image: 'postgres:15-alpine',
        port: 5432,
        user: 'testuser',
        database: 'testdb',
        password: 'testpass123',
        basePort: 5433,
        healthCheck: {
          command: 'pg_isready',
          args: ['-U', 'testuser', '-d', 'testdb'],
          interval: 2000,
          maxAttempts: 30
        },
        fileExtensions: ['.sql', '.dump', '.backup'],
        restoreCommands: {
          '.sql': 'psql',
          '.dump': 'pg_restore',
          '.backup': 'pg_restore'
        },
        environment: {
          passwordVar: 'PGPASSWORD'
        }
      },
      
      mysql: {
        image: 'mysql:8.0',
        port: 3306,
        user: 'testuser',
        database: 'testdb',
        password: 'testpass123',
        rootPassword: 'rootpass123',
        basePort: 3307,
        healthCheck: {
          command: 'mysqladmin',
          args: ['ping', '-h', 'localhost', '--silent'],
          interval: 2000,
          maxAttempts: 30
        },
        fileExtensions: ['.sql', '.dump'],
        restoreCommands: {
          '.sql': 'mysql',
          '.dump': 'mysql'
        },
        environment: {
          passwordVar: 'MYSQL_PWD'
        }
      }
    };
    
    this.environmentConfig = this.loadEnvironmentConfig();
  }

  /**
   * Get configuration for a specific database type
   * @param {string} databaseType - Database type identifier
   * @param {object} overrides - Configuration overrides
   * @returns {object}
   */
  getConfig(databaseType, overrides = {}) {
    const type = databaseType.toLowerCase();
    const defaultConfig = this.defaultConfigs[type];
    
    if (!defaultConfig) {
      throw new Error(`No configuration available for database type: ${databaseType}`);
    }
    
    // Merge default config with environment config and overrides
    const envConfig = this.environmentConfig[type] || {};
    
    return this.deepMerge(defaultConfig, envConfig, overrides);
  }

  /**
   * Load configuration from environment variables
   * @private
   */
  loadEnvironmentConfig() {
    const config = {};
    
    // PostgreSQL environment variables
    config.postgresql = {
      image: process.env.POSTGRES_TEST_IMAGE || undefined,
      user: process.env.POSTGRES_TEST_USER || undefined,
      database: process.env.POSTGRES_TEST_DATABASE || undefined,
      password: process.env.POSTGRES_TEST_PASSWORD || undefined,
      basePort: process.env.POSTGRES_TEST_BASE_PORT ? parseInt(process.env.POSTGRES_TEST_BASE_PORT) : undefined
    };
    
    // MySQL environment variables
    config.mysql = {
      image: process.env.MYSQL_TEST_IMAGE || undefined,
      user: process.env.MYSQL_TEST_USER || undefined,
      database: process.env.MYSQL_TEST_DATABASE || undefined,
      password: process.env.MYSQL_TEST_PASSWORD || undefined,
      rootPassword: process.env.MYSQL_TEST_ROOT_PASSWORD || undefined,
      basePort: process.env.MYSQL_TEST_BASE_PORT ? parseInt(process.env.MYSQL_TEST_BASE_PORT) : undefined
    };
    
    // Remove undefined values
    Object.keys(config).forEach(dbType => {
      Object.keys(config[dbType]).forEach(key => {
        if (config[dbType][key] === undefined) {
          delete config[dbType][key];
        }
      });
    });
    
    return config;
  }

  /**
   * Deep merge objects
   * @private
   */
  deepMerge(...objects) {
    const result = {};
    
    for (const obj of objects) {
      if (!obj) continue;
      
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.deepMerge(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get all supported database types
   * @returns {Array<string>}
   */
  getSupportedTypes() {
    return Object.keys(this.defaultConfigs);
  }

  /**
   * Validate configuration for a database type
   * @param {string} databaseType - Database type
   * @param {object} config - Configuration to validate
   * @returns {object} Validation result
   */
  validateConfig(databaseType, config) {
    const type = databaseType.toLowerCase();
    const requiredFields = ['image', 'port', 'user', 'database', 'password'];
    const errors = [];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Type-specific validation
    if (type === 'mysql' && !config.rootPassword) {
      errors.push('MySQL requires rootPassword field');
    }
    
    // Port validation
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }
    
    if (config.basePort && (config.basePort < 1 || config.basePort > 65535)) {
      errors.push('Base port must be between 1 and 65535');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration template for a specific database type
   * @param {string} databaseType - Database type
   * @returns {object}
   */
  getTemplate(databaseType) {
    const config = this.getConfig(databaseType);
    
    // Remove sensitive data from template
    const template = { ...config };
    delete template.password;
    delete template.rootPassword;
    
    return template;
  }

  /**
   * Get health check configuration for a database type
   * @param {string} databaseType - Database type
   * @returns {object}
   */
  getHealthCheckConfig(databaseType) {
    const config = this.getConfig(databaseType);
    return config.healthCheck;
  }

  /**
   * Get supported file extensions for a database type
   * @param {string} databaseType - Database type
   * @returns {Array<string>}
   */
  getSupportedExtensions(databaseType) {
    const config = this.getConfig(databaseType);
    return config.fileExtensions || [];
  }

  /**
   * Get restore command for a file type and database type
   * @param {string} databaseType - Database type
   * @param {string} fileExtension - File extension
   * @returns {string}
   */
  getRestoreCommand(databaseType, fileExtension) {
    const config = this.getConfig(databaseType);
    return config.restoreCommands[fileExtension] || null;
  }

  /**
   * Get environment variable configuration for a database type
   * @param {string} databaseType - Database type
   * @returns {object}
   */
  getEnvironmentConfig(databaseType) {
    const config = this.getConfig(databaseType);
    return config.environment || {};
  }

  /**
   * Create a configuration object for testing
   * @param {string} databaseType - Database type
   * @param {object} overrides - Configuration overrides
   * @returns {object}
   */
  createTestConfig(databaseType, overrides = {}) {
    const baseConfig = this.getConfig(databaseType);
    const testOverrides = {
      basePort: baseConfig.basePort + Math.floor(Math.random() * 100),
      ...overrides
    };
    
    return this.getConfig(databaseType, testOverrides);
  }
}

module.exports = DatabaseConfig;
