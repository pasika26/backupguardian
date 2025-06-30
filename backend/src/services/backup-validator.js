const { DatabaseFactory } = require('../database');
const SchemaValidator = require('./schema-validator');
const DataValidator = require('./data-validator');
const SamplingValidator = require('./sampling-validator');

/**
 * Main service that orchestrates backup validation
 */
class BackupValidator {
  constructor(options = {}) {
    this.databaseFactory = new DatabaseFactory();
    this.schemaValidator = new SchemaValidator();
    this.dataValidator = new DataValidator();
    this.samplingValidator = new SamplingValidator();
    this.defaultDatabaseType = options.defaultDatabaseType || 'postgresql';
  }

  /**
   * Validate a backup file by attempting to restore it
   * @param {string} backupFilePath - Path to the backup file
   * @param {object} options - Validation options
   * @returns {Promise<ValidationResult>}
   */
  async validateBackup(backupFilePath, options = {}) {
    const testId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Create database instance based on file or specified type
    const databaseType = options.databaseType || this.defaultDatabaseType;
    const database = this.databaseFactory.createDatabaseAuto({
      type: databaseType,
      filePath: backupFilePath,
      config: options.databaseConfig || {}
    });
    
    let container = null;
    const result = {
      testId,
      success: false,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      stages: {
        containerCreation: { success: false, duration: 0, error: null },
        restore: { success: false, duration: 0, error: null, output: null },
        validation: { success: false, duration: 0, error: null, details: null },
        cleanup: { success: false, duration: 0, error: null }
      },
      fileInfo: {
        path: backupFilePath,
        type: this.getFileType(backupFilePath),
        size: null
      },
      databaseInfo: {
        tableCount: 0,
        hasData: false,
        connectionInfo: null
      },
      errors: []
    };

    try {
      // Get file size
      const fs = require('fs').promises;
      const stats = await fs.stat(backupFilePath);
      result.fileInfo.size = stats.size;

      // Stage 1: Create container
      console.log(`🐳 Starting validation ${testId} with ${database.getDatabaseType()}`);
      const containerStart = Date.now();
      
      try {
        container = await database.createContainer(testId);
        result.stages.containerCreation.success = true;
        result.stages.containerCreation.duration = Date.now() - containerStart;
        result.databaseInfo.connectionInfo = container.connectionInfo;
        console.log(`✅ Container created: ${container.containerName}`);
      } catch (error) {
        result.stages.containerCreation.error = error.message;
        result.stages.containerCreation.duration = Date.now() - containerStart;
        result.errors.push(`Container creation failed: ${error.message}`);
        throw error;
      }

      // Stage 2: Execute restore
      const restoreStart = Date.now();
      try {
        const restoreResult = await database.restoreBackup(
          backupFilePath,
          container.connectionInfo,
          container.containerName
        );
        
        result.stages.restore.success = restoreResult.success;
        result.stages.restore.duration = Date.now() - restoreStart;
        result.stages.restore.output = restoreResult.output;
        
        if (!restoreResult.success) {
          result.stages.restore.error = restoreResult.error;
          result.errors.push(`Restore failed: ${restoreResult.error}`);
        }
        
        console.log(`${restoreResult.success ? '✅' : '❌'} Restore ${restoreResult.success ? 'succeeded' : 'failed'}`);
      } catch (error) {
        result.stages.restore.error = error.message;
        result.stages.restore.duration = Date.now() - restoreStart;
        result.errors.push(`Restore execution failed: ${error.message}`);
      }

      // Stage 3: Validate restored database (only if restore succeeded)
      if (result.stages.restore.success) {
        const validationStart = Date.now();
        try {
          const validation = await database.validateData(
            container.connectionInfo,
            container.containerName,
            options.dataValidationOptions || {}
          );
          
          result.stages.validation.success = validation.errors.length === 0;
          result.stages.validation.duration = Date.now() - validationStart;
          result.stages.validation.details = validation;
          
          result.databaseInfo.tableCount = validation.tableCount;
          result.databaseInfo.hasData = validation.hasData;
          
          // Enhanced schema validation
          if (options.enableSchemaValidation !== false) {
            try {
              const schemaValidation = await this.schemaValidator.validateTableCount(
                container.connectionInfo,
                options.originalSchema
              );
              
              result.stages.validation.schemaValidation = schemaValidation;
              result.databaseInfo.schemaDetails = {
                tables: schemaValidation.tables,
                views: schemaValidation.views,
                indexes: schemaValidation.indexes,
                constraints: schemaValidation.constraints,
                functions: schemaValidation.functions,
                sequences: schemaValidation.sequences,
                schemas: schemaValidation.schemas
              };
              
              if (!schemaValidation.success) {
                validation.errors.push(`Schema validation failed: ${schemaValidation.error}`);
              } else if (schemaValidation.comparison && !schemaValidation.comparison.identical) {
                const summary = schemaValidation.comparison.summary;
                validation.errors.push(`Schema differences found: ${summary.totalDifferences} differences (${summary.criticalIssues} critical)`);
              }
              
              console.log(`✅ Schema validation completed: ${schemaValidation.tableCount} tables, ${schemaValidation.views.length} views`);
            } catch (schemaError) {
              console.warn(`⚠️ Schema validation failed: ${schemaError.message}`);
              validation.errors.push(`Advanced schema validation failed: ${schemaError.message}`);
            }
          }

          // Enhanced data validation
          if (options.enableDataValidation !== false) {
            try {
              const dataValidation = await this.dataValidator.validateRowCounts(
                container.connectionInfo,
                options.expectedRowCounts,
                options.dataValidationOptions || {}
              );
              
              result.stages.validation.dataValidation = dataValidation;
              result.databaseInfo.dataDetails = {
                totalRows: dataValidation.totalRows,
                tableStats: dataValidation.tableStats,
                emptyTables: dataValidation.emptyTables,
                largeTables: dataValidation.largeTables,
                integrityIssues: dataValidation.dataIntegrityIssues
              };
              
              if (!dataValidation.success) {
                validation.errors.push(`Data validation failed: ${dataValidation.error || 'Data integrity issues found'}`);
              } else if (dataValidation.dataIntegrityIssues.length > 0) {
                const errorIssues = dataValidation.dataIntegrityIssues.filter(issue => issue.severity === 'error');
                if (errorIssues.length > 0) {
                  validation.errors.push(`Data integrity issues found: ${errorIssues.length} errors`);
                }
              }
              
              console.log(`✅ Data validation completed: ${dataValidation.totalRows} total rows, ${dataValidation.dataIntegrityIssues.length} issues`);
            } catch (dataError) {
              console.warn(`⚠️ Data validation failed: ${dataError.message}`);
              validation.errors.push(`Advanced data validation failed: ${dataError.message}`);
            }
          }
          
          if (validation.errors.length > 0) {
            result.stages.validation.error = validation.errors.join('; ');
            result.errors.push(...validation.errors);
          }
          
          console.log(`✅ Database validation completed: ${validation.tableCount} tables, has data: ${validation.hasData}`);
        } catch (error) {
          result.stages.validation.error = error.message;
          result.stages.validation.duration = Date.now() - validationStart;
          result.errors.push(`Database validation failed: ${error.message}`);
        }
      }

      // Determine overall success
      result.success = result.stages.containerCreation.success && 
                      result.stages.restore.success && 
                      result.stages.validation.success;

    } catch (error) {
      console.error(`❌ Validation ${testId} failed:`, error.message);
      if (!result.errors.includes(error.message)) {
        result.errors.push(error.message);
      }
    } finally {
      // Stage 4: Cleanup
      const cleanupStart = Date.now();
      try {
        if (container && database) {
          await database.cleanup(container.containerName);
          result.stages.cleanup.success = true;
          console.log(`🧹 Container cleanup completed`);
        }
      } catch (error) {
        result.stages.cleanup.error = error.message;
        console.error(`⚠️  Cleanup failed: ${error.message}`);
      }
      result.stages.cleanup.duration = Date.now() - cleanupStart;

      // Set final timestamps
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      
      console.log(`🏁 Validation ${testId} completed in ${result.duration}ms - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    return result;
  }

  /**
   * Get file type from extension
   * @private
   */
  getFileType(filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.sql': return 'sql';
      case '.dump': return 'dump';
      case '.backup': return 'backup';
      default: return 'unknown';
    }
  }

  /**
   * Validate multiple backup files
   * @param {Array<string>} backupFilePaths 
   * @param {object} options 
   * @returns {Promise<Array<ValidationResult>>}
   */
  async validateMultipleBackups(backupFilePaths, options = {}) {
    const results = [];
    
    for (const filePath of backupFilePaths) {
      try {
        const result = await this.validateBackup(filePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          testId: `failed-${Date.now()}`,
          success: false,
          errors: [error.message],
          fileInfo: { path: filePath, type: 'unknown', size: 0 }
        });
      }
    }
    
    return results;
  }

  /**
   * Get validation summary statistics
   * @param {Array<ValidationResult>} results 
   * @returns {object}
   */
  getValidationSummary(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;
    
    const fileTypes = results.reduce((acc, r) => {
      const type = r.fileInfo?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      successful,
      failed,
      successRate: Math.round((successful / total) * 100),
      avgDuration: Math.round(avgDuration),
      fileTypes,
      timestamp: new Date()
    };
  }

  /**
   * Emergency cleanup - remove all test containers
   */
  async emergencyCleanup() {
    console.log('🚨 Performing emergency cleanup...');
    
    // Cleanup for all supported database types
    const factory = new DatabaseFactory();
    const supportedTypes = factory.getSupportedTypes();
    
    for (const dbType of supportedTypes) {
      try {
        const database = factory.createDatabase(dbType);
        await database.cleanupAllContainers();
      } catch (error) {
        console.error(`Failed to cleanup ${dbType} containers:`, error.message);
      }
    }
  }
}

module.exports = BackupValidator;
