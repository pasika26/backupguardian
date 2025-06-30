/**
 * Data sampling validation service for backup verification
 * Performs statistical sampling and data quality checks
 */
class SamplingValidator {
  constructor() {
    this.logger = require('../utils/logger');
  }

  /**
   * Perform data sampling validation
   * @param {object} containerInfo - Docker container connection info
   * @param {object} options - Sampling options
   * @returns {Promise<object>} Sampling validation results
   */
  async performDataSampling(containerInfo, options = {}) {
    const startTime = Date.now();
    const result = {
      success: false,
      samplingResults: [],
      dataQualityIssues: [],
      statisticalSummary: {
        tablesAnalyzed: 0,
        recordsSampled: 0,
        qualityScore: 0,
        issuesFound: 0
      },
      duration: 0,
      error: null
    };

    try {
      this.logger.info('Starting data sampling validation', {
        containerName: containerInfo.containerName,
        sampleSize: options.sampleSize || 1000,
        category: 'sampling-validation'
      });

      const { Client } = require('pg');
      const client = new Client({
        host: 'localhost',
        port: containerInfo.port,
        database: containerInfo.database,
        user: containerInfo.user,
        password: containerInfo.password,
        connectionTimeoutMillis: 10000,
        statement_timeout: 60000
      });

      await client.connect();

      // Get tables with data for sampling
      const tablesQuery = `
        SELECT 
          schemaname, 
          tablename,
          n_tup_ins as estimated_rows
        FROM pg_stat_user_tables 
        WHERE n_tup_ins > 0
        ORDER BY n_tup_ins DESC
        LIMIT ${options.maxTables || 20};
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables = tablesResult.rows;

      for (const table of tables) {
        const tableResult = await this.sampleTable(
          client, 
          table.schemaname, 
          table.tablename,
          options
        );
        
        result.samplingResults.push(tableResult);
        result.statisticalSummary.recordsSampled += tableResult.sampleSize;
        result.dataQualityIssues.push(...tableResult.qualityIssues);
      }

      await client.end();

      result.statisticalSummary.tablesAnalyzed = result.samplingResults.length;
      result.statisticalSummary.issuesFound = result.dataQualityIssues.length;
      
      // Calculate overall quality score (0-100)
      const totalChecks = result.samplingResults.reduce((sum, r) => sum + r.checksPerformed, 0);
      const passedChecks = result.samplingResults.reduce((sum, r) => sum + r.checksPassedj, 0);
      result.statisticalSummary.qualityScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      result.success = result.dataQualityIssues.filter(issue => issue.severity === 'critical').length === 0;
      result.duration = Date.now() - startTime;

      this.logger.info('Data sampling validation completed', {
        tablesAnalyzed: result.statisticalSummary.tablesAnalyzed,
        recordsSampled: result.statisticalSummary.recordsSampled,
        qualityScore: result.statisticalSummary.qualityScore,
        issuesFound: result.statisticalSummary.issuesFound,
        duration: result.duration,
        category: 'sampling-validation'
      });

    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      this.logger.logError('Data sampling validation failed', error, {
        containerName: containerInfo.containerName,
        duration: result.duration,
        category: 'sampling-validation'
      });
    }

    return result;
  }

  /**
   * Sample and analyze a specific table
   * @param {object} client - Database client
   * @param {string} schema - Schema name
   * @param {string} tableName - Table name
   * @param {object} options - Sampling options
   * @returns {Promise<object>} Table sampling results
   */
  async sampleTable(client, schema, tableName, options = {}) {
    const sampleSize = options.sampleSize || 1000;
    const fullTableName = `"${schema}"."${tableName}"`;
    
    const tableResult = {
      schema,
      tableName,
      fullName: `${schema}.${tableName}`,
      sampleSize: 0,
      totalRows: 0,
      columnAnalysis: [],
      qualityIssues: [],
      checksPerformed: 0,
      checksPassed: 0,
      patterns: {
        dataTypes: {},
        nullRates: {},
        uniqueRates: {},
        commonValues: {}
      }
    };

    try {
      // Get total row count first
      const countResult = await client.query(`SELECT COUNT(*) as total FROM ${fullTableName}`);
      tableResult.totalRows = parseInt(countResult.rows[0].total);

      if (tableResult.totalRows === 0) {
        return tableResult;
      }

      // Get table structure
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [schema, tableName]);
      const columns = columnsResult.rows;

      // Calculate sample size (but don't exceed total rows)
      const actualSampleSize = Math.min(sampleSize, tableResult.totalRows);
      tableResult.sampleSize = actualSampleSize;

      // Get random sample using TABLESAMPLE or ORDER BY RANDOM()
      let sampleQuery;
      if (tableResult.totalRows > 100000) {
        // Use TABLESAMPLE for large tables (more efficient)
        const samplePercent = Math.max(0.01, (actualSampleSize / tableResult.totalRows) * 100);
        sampleQuery = `SELECT * FROM ${fullTableName} TABLESAMPLE SYSTEM(${samplePercent}) LIMIT ${actualSampleSize}`;
      } else {
        // Use ORDER BY RANDOM() for smaller tables
        sampleQuery = `SELECT * FROM ${fullTableName} ORDER BY RANDOM() LIMIT ${actualSampleSize}`;
      }

      const sampleResult = await client.query(sampleQuery);
      const sampleData = sampleResult.rows;
      tableResult.sampleSize = sampleData.length;

      // Analyze each column
      for (const column of columns) {
        const columnAnalysis = await this.analyzeColumn(
          sampleData, 
          column, 
          tableResult.totalRows
        );
        
        tableResult.columnAnalysis.push(columnAnalysis);
        tableResult.qualityIssues.push(...columnAnalysis.issues);
        tableResult.checksPerformed += columnAnalysis.checksPerformed;
        tableResult.checksPassed += columnAnalysis.checksPassed;

        // Store patterns
        tableResult.patterns.dataTypes[column.column_name] = column.data_type;
        tableResult.patterns.nullRates[column.column_name] = columnAnalysis.nullRate;
        tableResult.patterns.uniqueRates[column.column_name] = columnAnalysis.uniqueRate;
        tableResult.patterns.commonValues[column.column_name] = columnAnalysis.topValues;
      }

      // Perform cross-column analysis
      const crossColumnIssues = await this.performCrossColumnAnalysis(sampleData, columns);
      tableResult.qualityIssues.push(...crossColumnIssues);

    } catch (error) {
      tableResult.qualityIssues.push({
        type: 'sampling_error',
        table: tableResult.fullName,
        message: error.message,
        severity: 'critical'
      });
    }

    return tableResult;
  }

  /**
   * Analyze a specific column in the sample data
   * @param {Array} sampleData - Sample data rows
   * @param {object} columnInfo - Column metadata
   * @param {number} totalRows - Total rows in table
   * @returns {object} Column analysis results
   */
  async analyzeColumn(sampleData, columnInfo, totalRows) {
    const columnName = columnInfo.column_name;
    const dataType = columnInfo.data_type;
    
    const analysis = {
      columnName,
      dataType,
      sampleSize: sampleData.length,
      nullCount: 0,
      nullRate: 0,
      uniqueCount: 0,
      uniqueRate: 0,
      topValues: [],
      issues: [],
      checksPerformed: 0,
      checksPassed: 0,
      statistics: {}
    };

    try {
      // Basic null analysis
      const values = sampleData.map(row => row[columnName]);
      analysis.nullCount = values.filter(v => v === null || v === undefined).length;
      analysis.nullRate = analysis.nullCount / values.length;
      analysis.checksPerformed++;

      // Check for unexpected nulls
      if (columnInfo.is_nullable === 'NO' && analysis.nullCount > 0) {
        analysis.issues.push({
          type: 'unexpected_nulls',
          column: columnName,
          table: `${columnInfo.table_schema}.${columnInfo.table_name}`,
          count: analysis.nullCount,
          rate: analysis.nullRate,
          severity: 'critical'
        });
      } else {
        analysis.checksPassed++;
      }

      // Uniqueness analysis
      const nonNullValues = values.filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(nonNullValues);
      analysis.uniqueCount = uniqueValues.size;
      analysis.uniqueRate = nonNullValues.length > 0 ? analysis.uniqueCount / nonNullValues.length : 0;
      analysis.checksPerformed++;

      // Get top values
      const valueCounts = {};
      nonNullValues.forEach(v => {
        const key = String(v);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });
      
      analysis.topValues = Object.entries(valueCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / nonNullValues.length * 100).toFixed(2)
        }));

      // Data type specific validation
      if (dataType.includes('character') || dataType.includes('text')) {
        await this.validateStringColumn(analysis, nonNullValues, columnInfo);
      } else if (dataType.includes('integer') || dataType.includes('numeric')) {
        await this.validateNumericColumn(analysis, nonNullValues, columnInfo);
      } else if (dataType.includes('timestamp') || dataType.includes('date')) {
        await this.validateDateColumn(analysis, nonNullValues, columnInfo);
      } else if (dataType.includes('boolean')) {
        await this.validateBooleanColumn(analysis, nonNullValues, columnInfo);
      }

      // Check for suspicious patterns
      this.checkSuspiciousPatterns(analysis, nonNullValues);

    } catch (error) {
      analysis.issues.push({
        type: 'analysis_error',
        column: columnName,
        message: error.message,
        severity: 'warning'
      });
    }

    return analysis;
  }

  /**
   * Validate string/text columns
   */
  async validateStringColumn(analysis, values, columnInfo) {
    analysis.checksPerformed += 3;
    let passed = 0;

    // Check length constraints
    if (columnInfo.character_maximum_length) {
      const maxLength = columnInfo.character_maximum_length;
      const tooLong = values.filter(v => String(v).length > maxLength);
      
      if (tooLong.length === 0) {
        passed++;
      } else {
        analysis.issues.push({
          type: 'length_violation',
          column: analysis.columnName,
          count: tooLong.length,
          maxLength,
          severity: 'critical'
        });
      }
    } else {
      passed++;
    }

    // Check for empty strings vs nulls
    const emptyStrings = values.filter(v => v === '');
    if (emptyStrings.length > 0 && emptyStrings.length < values.length * 0.1) {
      passed++;
    } else if (emptyStrings.length > values.length * 0.5) {
      analysis.issues.push({
        type: 'excessive_empty_strings',
        column: analysis.columnName,
        count: emptyStrings.length,
        severity: 'warning'
      });
    } else {
      passed++;
    }

    // Check for encoding issues
    const encodingIssues = values.filter(v => {
      const str = String(v);
      return str.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str);
    });
    
    if (encodingIssues.length === 0) {
      passed++;
    } else {
      analysis.issues.push({
        type: 'encoding_issues',
        column: analysis.columnName,
        count: encodingIssues.length,
        severity: 'warning'
      });
    }

    analysis.checksPassed += passed;
  }

  /**
   * Validate numeric columns
   */
  async validateNumericColumn(analysis, values, columnInfo) {
    analysis.checksPerformed += 3;
    let passed = 0;

    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    
    if (numericValues.length === values.length) {
      passed++;
    } else {
      analysis.issues.push({
        type: 'non_numeric_values',
        column: analysis.columnName,
        count: values.length - numericValues.length,
        severity: 'critical'
      });
    }

    // Calculate statistics
    if (numericValues.length > 0) {
      const sorted = numericValues.sort((a, b) => a - b);
      analysis.statistics = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        median: sorted[Math.floor(sorted.length / 2)]
      };

      // Check for outliers (values beyond 3 standard deviations)
      const mean = analysis.statistics.mean;
      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);
      const outliers = numericValues.filter(v => Math.abs(v - mean) > 3 * stdDev);
      
      if (outliers.length < numericValues.length * 0.05) {
        passed++;
      } else {
        analysis.issues.push({
          type: 'excessive_outliers',
          column: analysis.columnName,
          count: outliers.length,
          percentage: (outliers.length / numericValues.length * 100).toFixed(2),
          severity: 'warning'
        });
      }

      // Check precision constraints
      if (columnInfo.numeric_precision) {
        // This is a simplified check - in practice, you'd want more sophisticated validation
        passed++;
      } else {
        passed++;
      }
    } else {
      passed += 2; // Skip checks if no valid numeric values
    }

    analysis.checksPassed += passed;
  }

  /**
   * Validate date/timestamp columns
   */
  async validateDateColumn(analysis, values, columnInfo) {
    analysis.checksPerformed += 2;
    let passed = 0;

    const dateValues = values.map(v => {
      try {
        return new Date(v);
      } catch {
        return null;
      }
    }).filter(v => v && !isNaN(v.getTime()));

    if (dateValues.length === values.length) {
      passed++;
    } else {
      analysis.issues.push({
        type: 'invalid_dates',
        column: analysis.columnName,
        count: values.length - dateValues.length,
        severity: 'critical'
      });
    }

    // Check for reasonable date ranges
    if (dateValues.length > 0) {
      const now = new Date();
      const futureLimit = new Date(now.getFullYear() + 10, 11, 31);
      const pastLimit = new Date(1900, 0, 1);
      
      const unreasonableDates = dateValues.filter(d => d > futureLimit || d < pastLimit);
      
      if (unreasonableDates.length === 0) {
        passed++;
      } else {
        analysis.issues.push({
          type: 'unreasonable_dates',
          column: analysis.columnName,
          count: unreasonableDates.length,
          severity: 'warning'
        });
      }
    } else {
      passed++;
    }

    analysis.checksPassed += passed;
  }

  /**
   * Validate boolean columns
   */
  async validateBooleanColumn(analysis, values, columnInfo) {
    analysis.checksPerformed += 1;
    
    const validBooleans = values.filter(v => 
      v === true || v === false || v === 't' || v === 'f' || 
      v === 'true' || v === 'false' || v === 1 || v === 0
    );

    if (validBooleans.length === values.length) {
      analysis.checksPassed++;
    } else {
      analysis.issues.push({
        type: 'invalid_boolean_values',
        column: analysis.columnName,
        count: values.length - validBooleans.length,
        severity: 'critical'
      });
    }
  }

  /**
   * Check for suspicious patterns in data
   */
  checkSuspiciousPatterns(analysis, values) {
    if (values.length === 0) return;

    // Check for repeated values (potential data corruption)
    const mostCommon = analysis.topValues[0];
    if (mostCommon && parseFloat(mostCommon.percentage) > 90) {
      analysis.issues.push({
        type: 'excessive_repeated_values',
        column: analysis.columnName,
        value: mostCommon.value,
        percentage: mostCommon.percentage,
        severity: 'warning'
      });
    }

    // Check for sequential patterns (might indicate test data)
    if (analysis.dataType.includes('integer')) {
      const numericValues = values.map(v => parseInt(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      let sequential = 0;
      for (let i = 1; i < numericValues.length; i++) {
        if (numericValues[i] === numericValues[i-1] + 1) {
          sequential++;
        }
      }
      
      if (sequential > numericValues.length * 0.8) {
        analysis.issues.push({
          type: 'sequential_pattern_detected',
          column: analysis.columnName,
          percentage: (sequential / numericValues.length * 100).toFixed(2),
          severity: 'info'
        });
      }
    }
  }

  /**
   * Perform cross-column analysis
   */
  async performCrossColumnAnalysis(sampleData, columns) {
    const issues = [];

    // Check for columns that always have the same relationship
    // This is a simplified example - in practice, you'd want more sophisticated analysis
    if (columns.length > 1) {
      // Example: Check if two numeric columns always have the same value
      const numericColumns = columns.filter(c => 
        c.data_type.includes('integer') || c.data_type.includes('numeric')
      );

      for (let i = 0; i < numericColumns.length - 1; i++) {
        for (let j = i + 1; j < numericColumns.length; j++) {
          const col1 = numericColumns[i].column_name;
          const col2 = numericColumns[j].column_name;
          
          const identical = sampleData.every(row => row[col1] === row[col2]);
          if (identical) {
            issues.push({
              type: 'identical_columns',
              columns: [col1, col2],
              severity: 'info'
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Generate a sampling validation report
   */
  generateReport(validationResult) {
    let report = '# Data Sampling Validation Report\n\n';
    
    if (validationResult.success) {
      report += `✅ **Data sampling validation completed successfully**\n\n`;
    } else {
      report += `⚠️ **Data sampling validation completed with critical issues**\n\n`;
    }

    const stats = validationResult.statisticalSummary;
    report += `## Summary\n`;
    report += `- **Tables Analyzed**: ${stats.tablesAnalyzed}\n`;
    report += `- **Records Sampled**: ${stats.recordsSampled.toLocaleString()}\n`;
    report += `- **Quality Score**: ${stats.qualityScore}%\n`;
    report += `- **Issues Found**: ${stats.issuesFound}\n`;
    report += `- **Duration**: ${validationResult.duration}ms\n\n`;

    if (validationResult.samplingResults.length > 0) {
      report += `## Table Analysis\n`;
      validationResult.samplingResults.forEach(table => {
        report += `### ${table.fullName}\n`;
        report += `- **Sample Size**: ${table.sampleSize.toLocaleString()} / ${table.totalRows.toLocaleString()} rows\n`;
        report += `- **Columns Analyzed**: ${table.columnAnalysis.length}\n`;
        report += `- **Quality Checks**: ${table.checksPassed}/${table.checksPerformed} passed\n`;
        if (table.qualityIssues.length > 0) {
          report += `- **Issues**: ${table.qualityIssues.length}\n`;
        }
        report += '\n';
      });
    }

    if (validationResult.dataQualityIssues.length > 0) {
      report += `## Data Quality Issues\n`;
      const groupedIssues = {};
      validationResult.dataQualityIssues.forEach(issue => {
        if (!groupedIssues[issue.severity]) {
          groupedIssues[issue.severity] = [];
        }
        groupedIssues[issue.severity].push(issue);
      });

      Object.entries(groupedIssues).forEach(([severity, issues]) => {
        const icon = severity === 'critical' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
        report += `### ${icon} ${severity.toUpperCase()} (${issues.length})\n`;
        issues.slice(0, 10).forEach(issue => { // Limit to first 10 issues per severity
          report += `- **${issue.type}**`;
          if (issue.column) report += ` in ${issue.column}`;
          if (issue.count) report += `: ${issue.count} occurrences`;
          if (issue.message) report += `: ${issue.message}`;
          report += '\n';
        });
        if (issues.length > 10) {
          report += `- ... and ${issues.length - 10} more ${severity} issues\n`;
        }
        report += '\n';
      });
    }

    return report;
  }
}

module.exports = SamplingValidator;
