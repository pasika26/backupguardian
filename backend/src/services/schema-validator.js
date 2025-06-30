/**
 * Advanced schema validation service for backup verification
 */
class SchemaValidator {
  constructor() {
    this.logger = require('../utils/logger');
  }

  /**
   * Validate table count and schema structure
   * @param {object} containerInfo - Docker container connection info
   * @param {object} originalSchema - Original database schema for comparison (optional)
   * @returns {Promise<object>} Schema validation results
   */
  async validateTableCount(containerInfo, originalSchema = null) {
    const startTime = Date.now();
    const result = {
      success: false,
      tableCount: 0,
      tables: [],
      views: [],
      indexes: [],
      constraints: [],
      functions: [],
      sequences: [],
      schemas: [],
      comparison: null,
      duration: 0,
      error: null
    };

    try {
      this.logger.info('Starting table count validation', {
        containerName: containerInfo.containerName,
        category: 'schema-validation'
      });

      const { Client } = require('pg');
      const client = new Client({
        host: 'localhost',
        port: containerInfo.port,
        database: containerInfo.database,
        user: containerInfo.user,
        password: containerInfo.password,
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000
      });

      await client.connect();

      // Get all tables
      const tablesQuery = `
        SELECT 
          schemaname,
          tablename,
          tableowner,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename;
      `;
      
      const tablesResult = await client.query(tablesQuery);
      result.tables = tablesResult.rows;
      result.tableCount = tablesResult.rows.length;

      // Get all views
      const viewsQuery = `
        SELECT 
          schemaname,
          viewname,
          viewowner,
          definition
        FROM pg_views 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, viewname;
      `;
      
      const viewsResult = await client.query(viewsQuery);
      result.views = viewsResult.rows;

      // Get all indexes
      const indexesQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename, indexname;
      `;
      
      const indexesResult = await client.query(indexesQuery);
      result.indexes = indexesResult.rows;

      // Get all constraints
      const constraintsQuery = `
        SELECT 
          tc.constraint_schema,
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          cc.check_clause,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY tc.constraint_schema, tc.table_name, tc.constraint_name;
      `;
      
      const constraintsResult = await client.query(constraintsQuery);
      result.constraints = constraintsResult.rows;

      // Get all functions
      const functionsQuery = `
        SELECT 
          n.nspname AS schema_name,
          p.proname AS function_name,
          pg_get_function_result(p.oid) AS return_type,
          pg_get_function_arguments(p.oid) AS arguments,
          l.lanname AS language
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, p.proname;
      `;
      
      const functionsResult = await client.query(functionsQuery);
      result.functions = functionsResult.rows;

      // Get all sequences
      const sequencesQuery = `
        SELECT 
          schemaname,
          sequencename,
          sequenceowner,
          start_value,
          min_value,
          max_value,
          increment_by
        FROM pg_sequences 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, sequencename;
      `;
      
      const sequencesResult = await client.query(sequencesQuery);
      result.sequences = sequencesResult.rows;

      // Get all schemas
      const schemasQuery = `
        SELECT 
          schema_name,
          schema_owner
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name;
      `;
      
      const schemasResult = await client.query(schemasQuery);
      result.schemas = schemasResult.rows;

      await client.end();

      // Compare with original schema if provided
      if (originalSchema) {
        result.comparison = this.compareSchemas(result, originalSchema);
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      this.logger.info('Table count validation completed', {
        tableCount: result.tableCount,
        viewCount: result.views.length,
        indexCount: result.indexes.length,
        constraintCount: result.constraints.length,
        functionCount: result.functions.length,
        sequenceCount: result.sequences.length,
        schemaCount: result.schemas.length,
        duration: result.duration,
        category: 'schema-validation'
      });

    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      this.logger.logError('Table count validation failed', error, {
        containerName: containerInfo.containerName,
        duration: result.duration,
        category: 'schema-validation'
      });
    }

    return result;
  }

  /**
   * Compare two schemas and identify differences
   * @param {object} currentSchema - Current restored schema
   * @param {object} originalSchema - Original expected schema
   * @returns {object} Comparison results
   */
  compareSchemas(currentSchema, originalSchema) {
    const comparison = {
      identical: true,
      differences: {
        tables: { missing: [], extra: [], modified: [] },
        views: { missing: [], extra: [], modified: [] },
        indexes: { missing: [], extra: [], modified: [] },
        constraints: { missing: [], extra: [], modified: [] },
        functions: { missing: [], extra: [], modified: [] },
        sequences: { missing: [], extra: [], modified: [] },
        schemas: { missing: [], extra: [], modified: [] }
      },
      summary: {
        totalDifferences: 0,
        criticalIssues: 0,
        warnings: 0
      }
    };

    try {
      // Compare tables
      this.compareLists(
        currentSchema.tables, 
        originalSchema.tables, 
        'tablename', 
        comparison.differences.tables
      );

      // Compare views
      this.compareLists(
        currentSchema.views, 
        originalSchema.views, 
        'viewname', 
        comparison.differences.views
      );

      // Compare indexes
      this.compareLists(
        currentSchema.indexes, 
        originalSchema.indexes, 
        'indexname', 
        comparison.differences.indexes
      );

      // Compare constraints
      this.compareLists(
        currentSchema.constraints, 
        originalSchema.constraints, 
        'constraint_name', 
        comparison.differences.constraints
      );

      // Compare functions
      this.compareLists(
        currentSchema.functions, 
        originalSchema.functions, 
        'function_name', 
        comparison.differences.functions
      );

      // Compare sequences
      this.compareLists(
        currentSchema.sequences, 
        originalSchema.sequences, 
        'sequencename', 
        comparison.differences.sequences
      );

      // Compare schemas
      this.compareLists(
        currentSchema.schemas, 
        originalSchema.schemas, 
        'schema_name', 
        comparison.differences.schemas
      );

      // Calculate summary
      Object.values(comparison.differences).forEach(diff => {
        comparison.summary.totalDifferences += diff.missing.length + diff.extra.length + diff.modified.length;
        comparison.summary.criticalIssues += diff.missing.length; // Missing items are critical
        comparison.summary.warnings += diff.extra.length + diff.modified.length;
      });

      comparison.identical = comparison.summary.totalDifferences === 0;

    } catch (error) {
      this.logger.logError('Schema comparison failed', error, {
        category: 'schema-validation'
      });
    }

    return comparison;
  }

  /**
   * Compare two lists of database objects
   * @param {Array} currentList - Current objects
   * @param {Array} originalList - Original objects
   * @param {string} keyField - Field to use for comparison
   * @param {object} result - Result object to populate
   */
  compareLists(currentList, originalList, keyField, result) {
    const currentKeys = new Set(currentList.map(item => item[keyField]));
    const originalKeys = new Set(originalList.map(item => item[keyField]));

    // Find missing items (in original but not in current)
    originalKeys.forEach(key => {
      if (!currentKeys.has(key)) {
        result.missing.push(key);
      }
    });

    // Find extra items (in current but not in original)
    currentKeys.forEach(key => {
      if (!originalKeys.has(key)) {
        result.extra.push(key);
      }
    });

    // Find modified items (exist in both but may have differences)
    // This is a simplified check - in practice, you might want to compare more fields
    currentList.forEach(currentItem => {
      const originalItem = originalList.find(item => item[keyField] === currentItem[keyField]);
      if (originalItem) {
        const currentJson = JSON.stringify(currentItem);
        const originalJson = JSON.stringify(originalItem);
        if (currentJson !== originalJson) {
          result.modified.push({
            name: currentItem[keyField],
            current: currentItem,
            original: originalItem
          });
        }
      }
    });
  }

  /**
   * Generate a schema validation report
   * @param {object} validationResult - Schema validation result
   * @returns {string} Human-readable report
   */
  generateReport(validationResult) {
    let report = '# Schema Validation Report\n\n';
    
    if (validationResult.success) {
      report += `✅ **Schema validation completed successfully**\n\n`;
      report += `## Summary\n`;
      report += `- **Tables**: ${validationResult.tableCount}\n`;
      report += `- **Views**: ${validationResult.views.length}\n`;
      report += `- **Indexes**: ${validationResult.indexes.length}\n`;
      report += `- **Constraints**: ${validationResult.constraints.length}\n`;
      report += `- **Functions**: ${validationResult.functions.length}\n`;
      report += `- **Sequences**: ${validationResult.sequences.length}\n`;
      report += `- **Schemas**: ${validationResult.schemas.length}\n`;
      report += `- **Duration**: ${validationResult.duration}ms\n\n`;

      if (validationResult.comparison) {
        report += `## Schema Comparison\n`;
        if (validationResult.comparison.identical) {
          report += `✅ **Schema matches original perfectly**\n\n`;
        } else {
          report += `⚠️ **${validationResult.comparison.summary.totalDifferences} differences found**\n`;
          report += `- Critical Issues: ${validationResult.comparison.summary.criticalIssues}\n`;
          report += `- Warnings: ${validationResult.comparison.summary.warnings}\n\n`;
          
          // Detail differences
          Object.entries(validationResult.comparison.differences).forEach(([type, diff]) => {
            if (diff.missing.length > 0 || diff.extra.length > 0 || diff.modified.length > 0) {
              report += `### ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
              if (diff.missing.length > 0) {
                report += `- **Missing**: ${diff.missing.join(', ')}\n`;
              }
              if (diff.extra.length > 0) {
                report += `- **Extra**: ${diff.extra.join(', ')}\n`;
              }
              if (diff.modified.length > 0) {
                report += `- **Modified**: ${diff.modified.map(m => m.name).join(', ')}\n`;
              }
              report += '\n';
            }
          });
        }
      }
    } else {
      report += `❌ **Schema validation failed**\n\n`;
      report += `**Error**: ${validationResult.error}\n`;
      report += `**Duration**: ${validationResult.duration}ms\n\n`;
    }

    return report;
  }
}

module.exports = SchemaValidator;
