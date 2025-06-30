/**
 * Data validation service for backup verification
 * Validates row counts, data integrity, and completeness
 */
class DataValidator {
  constructor() {
    this.logger = require('../utils/logger');
  }

  /**
   * Validate row counts and data completeness
   * @param {object} containerInfo - Docker container connection info
   * @param {object} expectedCounts - Expected row counts for comparison (optional)
   * @param {object} options - Validation options
   * @returns {Promise<object>} Data validation results
   */
  async validateRowCounts(containerInfo, expectedCounts = null, options = {}) {
    const startTime = Date.now();
    const result = {
      success: false,
      totalRows: 0,
      tableStats: [],
      emptyTables: [],
      largeTables: [],
      comparison: null,
      dataIntegrityIssues: [],
      duration: 0,
      error: null
    };

    try {
      this.logger.info('Starting row count validation', {
        containerName: containerInfo.containerName,
        category: 'data-validation'
      });

      const { Client } = require('pg');
      const client = new Client({
        host: 'localhost',
        port: containerInfo.port,
        database: containerInfo.database,
        user: containerInfo.user,
        password: containerInfo.password,
        connectionTimeoutMillis: 10000,
        statement_timeout: 60000 // Longer timeout for data queries
      });

      await client.connect();

      // Get all user tables first
      const tablesQuery = `
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename;
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables = tablesResult.rows;

      // Get row counts for each table
      for (const table of tables) {
        const tableStart = Date.now();
        const tableStat = {
          schema: table.schemaname,
          table: table.tablename,
          fullName: `${table.schemaname}.${table.tablename}`,
          rowCount: 0,
          approximateSize: null,
          hasNulls: false,
          nullColumns: [],
          dataTypes: [],
          duration: 0,
          error: null
        };

        try {
          // Get exact row count
          const countQuery = `SELECT COUNT(*) as row_count FROM "${table.schemaname}"."${table.tablename}";`;
          const countResult = await client.query(countQuery);
          tableStat.rowCount = parseInt(countResult.rows[0].row_count);
          result.totalRows += tableStat.rowCount;

          // Get table size information
          const sizeQuery = `
            SELECT 
              pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
              pg_size_pretty(pg_relation_size(c.oid)) as table_size,
              pg_total_relation_size(c.oid) as total_bytes
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = $1 AND n.nspname = $2;
          `;
          
          const sizeResult = await client.query(sizeQuery, [table.tablename, table.schemaname]);
          if (sizeResult.rows.length > 0) {
            tableStat.approximateSize = sizeResult.rows[0];
          }

          // Get column information and check for nulls (if table has data)
          if (tableStat.rowCount > 0) {
            const columnsQuery = `
              SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
              FROM information_schema.columns
              WHERE table_schema = $1 AND table_name = $2
              ORDER BY ordinal_position;
            `;
            
            const columnsResult = await client.query(columnsQuery, [table.schemaname, table.tablename]);
            tableStat.dataTypes = columnsResult.rows;

            // Check for NULL values in columns that shouldn't have them
            for (const column of columnsResult.rows) {
              if (column.is_nullable === 'NO') {
                const nullCheckQuery = `
                  SELECT COUNT(*) as null_count 
                  FROM "${table.schemaname}"."${table.tablename}" 
                  WHERE "${column.column_name}" IS NULL;
                `;
                
                const nullResult = await client.query(nullCheckQuery);
                const nullCount = parseInt(nullResult.rows[0].null_count);
                
                if (nullCount > 0) {
                  tableStat.hasNulls = true;
                  tableStat.nullColumns.push({
                    column: column.column_name,
                    nullCount,
                    dataType: column.data_type
                  });
                  
                  result.dataIntegrityIssues.push({
                    type: 'unexpected_nulls',
                    table: tableStat.fullName,
                    column: column.column_name,
                    count: nullCount,
                    severity: 'error'
                  });
                }
              }
            }
          }

          // Categorize tables
          if (tableStat.rowCount === 0) {
            result.emptyTables.push(tableStat.fullName);
          } else if (tableStat.rowCount > (options.largeTableThreshold || 100000)) {
            result.largeTables.push({
              table: tableStat.fullName,
              rowCount: tableStat.rowCount,
              size: tableStat.approximateSize?.total_size
            });
          }

        } catch (error) {
          tableStat.error = error.message;
          result.dataIntegrityIssues.push({
            type: 'query_error',
            table: tableStat.fullName,
            error: error.message,
            severity: 'error'
          });
        }

        tableStat.duration = Date.now() - tableStart;
        result.tableStats.push(tableStat);
      }

      await client.end();

      // Compare with expected counts if provided
      if (expectedCounts) {
        result.comparison = this.compareRowCounts(result.tableStats, expectedCounts);
      }

      // Perform additional data integrity checks
      await this.performDataIntegrityChecks(containerInfo, result, options);

      result.success = result.dataIntegrityIssues.filter(issue => issue.severity === 'error').length === 0;
      result.duration = Date.now() - startTime;

      this.logger.info('Row count validation completed', {
        totalTables: result.tableStats.length,
        totalRows: result.totalRows,
        emptyTables: result.emptyTables.length,
        largeTables: result.largeTables.length,
        integrityIssues: result.dataIntegrityIssues.length,
        duration: result.duration,
        category: 'data-validation'
      });

    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      this.logger.logError('Row count validation failed', error, {
        containerName: containerInfo.containerName,
        duration: result.duration,
        category: 'data-validation'
      });
    }

    return result;
  }

  /**
   * Compare row counts with expected values
   * @param {Array} actualStats - Actual table statistics
   * @param {object} expectedCounts - Expected row counts
   * @returns {object} Comparison results
   */
  compareRowCounts(actualStats, expectedCounts) {
    const comparison = {
      identical: true,
      differences: [],
      summary: {
        totalDifferences: 0,
        missingTables: 0,
        extraTables: 0,
        countMismatches: 0,
        totalVariance: 0
      }
    };

    try {
      const actualMap = new Map();
      actualStats.forEach(stat => {
        actualMap.set(stat.fullName, stat.rowCount);
      });

      // Check for missing tables and count differences
      Object.entries(expectedCounts).forEach(([tableName, expectedCount]) => {
        const actualCount = actualMap.get(tableName);
        
        if (actualCount === undefined) {
          comparison.differences.push({
            type: 'missing_table',
            table: tableName,
            expected: expectedCount,
            actual: 0,
            variance: -expectedCount
          });
          comparison.summary.missingTables++;
        } else if (actualCount !== expectedCount) {
          const variance = actualCount - expectedCount;
          comparison.differences.push({
            type: 'count_mismatch',
            table: tableName,
            expected: expectedCount,
            actual: actualCount,
            variance: variance,
            percentageChange: expectedCount > 0 ? ((variance / expectedCount) * 100).toFixed(2) : 'N/A'
          });
          comparison.summary.countMismatches++;
          comparison.summary.totalVariance += Math.abs(variance);
        }
        
        actualMap.delete(tableName);
      });

      // Check for extra tables
      actualMap.forEach((count, tableName) => {
        comparison.differences.push({
          type: 'extra_table',
          table: tableName,
          expected: 0,
          actual: count,
          variance: count
        });
        comparison.summary.extraTables++;
      });

      comparison.summary.totalDifferences = comparison.differences.length;
      comparison.identical = comparison.summary.totalDifferences === 0;

    } catch (error) {
      this.logger.logError('Row count comparison failed', error, {
        category: 'data-validation'
      });
    }

    return comparison;
  }

  /**
   * Perform additional data integrity checks
   * @param {object} containerInfo - Container connection info
   * @param {object} result - Validation result to update
   * @param {object} options - Validation options
   */
  async performDataIntegrityChecks(containerInfo, result, options) {
    try {
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

      // Check for foreign key constraint violations
      const fkViolationsQuery = `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('information_schema', 'pg_catalog');
      `;

      const fkResult = await client.query(fkViolationsQuery);
      
      // For each foreign key, check for violations
      for (const fk of fkResult.rows) {
        const violationQuery = `
          SELECT COUNT(*) as violation_count
          FROM "${fk.table_name}" t1
          LEFT JOIN "${fk.foreign_table_name}" t2 
            ON t1."${fk.column_name}" = t2."${fk.foreign_column_name}"
          WHERE t1."${fk.column_name}" IS NOT NULL 
            AND t2."${fk.foreign_column_name}" IS NULL;
        `;

        try {
          const violationResult = await client.query(violationQuery);
          const violationCount = parseInt(violationResult.rows[0].violation_count);
          
          if (violationCount > 0) {
            result.dataIntegrityIssues.push({
              type: 'foreign_key_violation',
              table: fk.table_name,
              constraint: fk.constraint_name,
              count: violationCount,
              severity: 'error'
            });
          }
        } catch (error) {
          // Skip if query fails (table might not exist after restore)
        }
      }

      // Check for duplicate values in unique columns
      const uniqueConstraintsQuery = `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          array_agg(kcu.column_name) as columns
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
          AND tc.table_schema NOT IN ('information_schema', 'pg_catalog')
        GROUP BY tc.table_name, tc.constraint_name;
      `;

      const uniqueResult = await client.query(uniqueConstraintsQuery);
      
      for (const constraint of uniqueResult.rows) {
        const columnList = constraint.columns.join('", "');
        const duplicateQuery = `
          SELECT COUNT(*) as duplicate_count
          FROM (
            SELECT "${columnList}", COUNT(*) as cnt
            FROM "${constraint.table_name}"
            GROUP BY "${columnList}"
            HAVING COUNT(*) > 1
          ) duplicates;
        `;

        try {
          const duplicateResult = await client.query(duplicateQuery);
          const duplicateCount = parseInt(duplicateResult.rows[0].duplicate_count);
          
          if (duplicateCount > 0) {
            result.dataIntegrityIssues.push({
              type: 'unique_constraint_violation',
              table: constraint.table_name,
              constraint: constraint.constraint_name,
              count: duplicateCount,
              severity: 'error'
            });
          }
        } catch (error) {
          // Skip if query fails
        }
      }

      await client.end();

    } catch (error) {
      this.logger.logError('Data integrity checks failed', error, {
        category: 'data-validation'
      });
    }
  }

  /**
   * Generate a data validation report
   * @param {object} validationResult - Data validation result
   * @returns {string} Human-readable report
   */
  generateReport(validationResult) {
    let report = '# Data Validation Report\n\n';
    
    if (validationResult.success) {
      report += `✅ **Data validation completed successfully**\n\n`;
    } else {
      report += `⚠️ **Data validation completed with ${validationResult.dataIntegrityIssues.filter(i => i.severity === 'error').length} issues**\n\n`;
    }

    report += `## Summary\n`;
    report += `- **Total Tables**: ${validationResult.tableStats.length}\n`;
    report += `- **Total Rows**: ${validationResult.totalRows.toLocaleString()}\n`;
    report += `- **Empty Tables**: ${validationResult.emptyTables.length}\n`;
    report += `- **Large Tables**: ${validationResult.largeTables.length}\n`;
    report += `- **Data Issues**: ${validationResult.dataIntegrityIssues.length}\n`;
    report += `- **Duration**: ${validationResult.duration}ms\n\n`;

    if (validationResult.emptyTables.length > 0) {
      report += `## Empty Tables\n`;
      validationResult.emptyTables.forEach(table => {
        report += `- ${table}\n`;
      });
      report += '\n';
    }

    if (validationResult.largeTables.length > 0) {
      report += `## Large Tables\n`;
      validationResult.largeTables.forEach(table => {
        report += `- **${table.table}**: ${table.rowCount.toLocaleString()} rows (${table.size})\n`;
      });
      report += '\n';
    }

    if (validationResult.dataIntegrityIssues.length > 0) {
      report += `## Data Integrity Issues\n`;
      validationResult.dataIntegrityIssues.forEach(issue => {
        const severity = issue.severity === 'error' ? '❌' : '⚠️';
        report += `${severity} **${issue.type}** in ${issue.table}`;
        if (issue.count) report += `: ${issue.count} occurrences`;
        if (issue.error) report += `: ${issue.error}`;
        report += '\n';
      });
      report += '\n';
    }

    if (validationResult.comparison) {
      report += `## Row Count Comparison\n`;
      if (validationResult.comparison.identical) {
        report += `✅ **All row counts match expectations**\n\n`;
      } else {
        report += `⚠️ **${validationResult.comparison.summary.totalDifferences} differences found**\n`;
        report += `- Missing Tables: ${validationResult.comparison.summary.missingTables}\n`;
        report += `- Extra Tables: ${validationResult.comparison.summary.extraTables}\n`;
        report += `- Count Mismatches: ${validationResult.comparison.summary.countMismatches}\n`;
        report += `- Total Variance: ${validationResult.comparison.summary.totalVariance}\n\n`;
        
        if (validationResult.comparison.differences.length > 0) {
          report += `### Differences\n`;
          validationResult.comparison.differences.forEach(diff => {
            report += `- **${diff.table}**: Expected ${diff.expected}, Got ${diff.actual}`;
            if (diff.percentageChange !== 'N/A') {
              report += ` (${diff.percentageChange}% change)`;
            }
            report += '\n';
          });
          report += '\n';
        }
      }
    }

    return report;
  }
}

module.exports = DataValidator;
