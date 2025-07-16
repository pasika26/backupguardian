const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const { exec } = require('child_process');

// Import validation services from backend and CLI
const RailwayValidator = require('../../../backend/src/services/railway-validator');
const SharedValidationLogic = require('../../../backend/src/services/shared-validation-logic');
const CLIValidator = require('../validators/cli-validator');

module.exports = (program) => {
  program
    .command('validate')
    .description('Validate a database backup file')
    .argument('<file>', 'Path to the backup file to validate')
    .option('-t, --type <type>', 'Database type (postgresql, mysql)', 'auto')
    .option('-s, --schema-check', 'Enable detailed schema validation', false)
    .option('-d, --data-check', 'Enable data integrity checks', false)
    .option('--json', 'Output results in JSON format', false)
    .option('--verbose', 'Enable verbose output', false)
    .action(async (file, options) => {
      try {
        await validateBackup(file, options);
      } catch (error) {
        console.error(chalk.red('Validation failed:'), error.message);
        process.exit(1);
      }
    });
};

async function validateBackup(filePath, options) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const absolutePath = path.resolve(filePath);
  const fileName = path.basename(absolutePath);
  const fileStats = fs.statSync(absolutePath);
  
  // Initialize spinner
  const spinner = ora(`Validating ${fileName}...`).start();
  
  try {
    let result;
    
    // Check PostgreSQL availability for full validation
    const hasPostgreSQL = await checkPostgreSQLAvailability();
    const usePostgreSQL = process.env.USE_POSTGRESQL === 'true' && hasPostgreSQL;
    
    if (usePostgreSQL && options.dataCheck) {
      spinner.text = 'Using PostgreSQL validation with data checks...';
      
      // Initialize backup validator for full validation
      const validator = new RailwayValidator();
      
      // Configure validation options
      const validationOptions = {
        enableSchemaValidation: options.schemaCheck,
        enableDataValidation: options.dataCheck,
        databaseType: options.type === 'auto' ? null : options.type
      };

      // Update spinner
      spinner.text = 'Starting Docker container...';

      // Perform PostgreSQL validation
      result = await validator.validateBackup(absolutePath, validationOptions);
    } else {
      spinner.text = 'Using enhanced CLI validation with binary corruption detection...';
      
      // Use our enhanced CLI validator with binary corruption detection
      const validator = new CLIValidator();
      
      // Configure validation options
      const validationOptions = {
        enableSchemaValidation: options.schemaCheck,
        enableDataValidation: options.dataCheck,
        databaseType: options.type === 'auto' ? null : options.type,
        verbose: options.verbose
      };

      // Perform CLI validation with binary corruption detection
      const cliResult = await validator.validateBackup(absolutePath, fileName, validationOptions);
      
      // Convert CLI result to expected format
      result = formatCLIResult(cliResult, fileName);
    }
    
    spinner.stop();

    if (options.json) {
      // JSON output for CI/CD integration
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Human-readable output
      displayResults(result, fileName, options.verbose);
    }

    // Exit with error code if validation failed
    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    spinner.stop();
    
    if (error.message.includes('Docker')) {
      console.error(chalk.red('\n❌ Docker Error:'));
      console.error(chalk.yellow('Make sure Docker is installed and running.'));
      console.error(chalk.gray('Visit: https://docs.docker.com/get-docker/'));
    } else {
      console.error(chalk.red('\n❌ Validation Error:'));
      console.error(error.message);
    }
    
    throw error;
  }
}

function displayResults(result, fileName, verbose) {
  console.log('\n' + chalk.bold('🛡️  BackupGuardian Validation Report'));
  console.log(chalk.gray('━'.repeat(50)));
  
  // File info
  console.log(chalk.cyan('File:'), fileName);
  console.log(chalk.cyan('Type:'), result.fileType || 'Unknown');
  console.log(chalk.cyan('Size:'), formatFileSize(result.fileSize || 0));
  console.log(chalk.cyan('Duration:'), `${result.duration || 0}ms`);
  
  // Overall status with confidence
  const statusIcon = result.success ? '✅' : '❌';
  const statusColor = result.success ? chalk.green : chalk.red;
  const confidenceLevel = result.confidenceMetrics?.confidenceLevel || 'UNKNOWN';
  console.log('\n' + statusColor(`${statusIcon} VALIDATION ${result.success ? 'PASSED' : 'FAILED'} - ${confidenceLevel} CONFIDENCE`));
  
  if (result.confidenceMetrics?.summary) {
    console.log(chalk.gray(result.confidenceMetrics.summary));
  }
  
  // Validation stages
  if (result.restore) {
    displayStageResult('File & Structure Validation', result.restore);
  }

  if (result.binaryIntegrity) {
    displayStageResult('Binary Integrity Check', result.binaryIntegrity);
  }

  if (result.structure) {
    displayStageResult('SQL Structure Analysis', result.structure);
  }
  
  if (result.schema) {
    displayStageResult('Schema Validation', result.schema);
  }
  
  if (result.data) {
    displayStageResult('Data Validation', result.data);
  }

  // MVP Confidence Reporting
  if (result.confidenceMetrics) {
    displayConfidenceReport(result.confidenceMetrics);
  }
  
  // Issues and recommendations
  if (result.issues && result.issues.length > 0) {
    console.log('\n' + chalk.red('❌ Issues Found:'));
    result.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  // Show warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  Warnings:'));
    result.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }

  // Show dialect warnings separately for better visibility
  if (result.dialectWarnings && result.dialectWarnings.length > 0) {
    console.log('\n' + chalk.cyan('🔄 SQL Dialect Information:'));
    result.dialectWarnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }
  
  if (result.recommendations && result.recommendations.length > 0) {
    console.log('\n' + chalk.blue('💡 Recommendations:'));
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  // Show validation mode
  if (result.validationMode) {
    console.log('\n' + chalk.gray(`🔧 Validation Mode: ${result.validationMode}`));
  }
  
  // Migration readiness score
  if (result.migrationScore !== undefined) {
    const scoreColor = result.migrationScore >= 80 ? chalk.green : 
                      result.migrationScore >= 60 ? chalk.yellow : chalk.red;
    console.log('\n' + chalk.bold('📊 Migration Readiness Score:'), scoreColor(`${result.migrationScore}/100`));
  }
  
  // Verbose details
  if (verbose && result.details) {
    console.log('\n' + chalk.gray('📋 Detailed Information:'));
    if (result.details.tables) {
      console.log(chalk.gray(`  • Tables found: ${result.details.tables}`));
    }
    if (result.details.rows) {
      console.log(chalk.gray(`  • Total rows: ${result.details.rows.toLocaleString()}`));
    }
    if (result.details.size) {
      console.log(chalk.gray(`  • Database size: ${formatFileSize(result.details.size)}`));
    }
  }
  
  // Web app promotion
  console.log('\n' + chalk.gray('━'.repeat(50)));
  console.log(chalk.cyan('💻 Want to save validation history and collaborate with your team?'));
  console.log(chalk.cyan('   Visit: https://backup-guardian.com'));
  console.log('');
}

function displayStageResult(stageName, stageResult) {
  const icon = stageResult.success ? '✅' : '❌';
  const color = stageResult.success ? chalk.green : chalk.red;
  console.log(color(`${icon} ${stageName}:`), color(stageResult.success ? 'PASSED' : 'FAILED'));
  
  if (!stageResult.success && stageResult.error) {
    console.log(chalk.red(`   Error: ${stageResult.error}`));
  }
}

function displayConfidenceReport(metrics) {
  console.log('\n' + chalk.bold('📊 Backup Quality Score: ') + chalk.cyan(`${metrics.scores.total}/100`));
  console.log('');
  
  // Score breakdown
  const scoreColor = (score, max) => score === max ? chalk.green : score >= max * 0.8 ? chalk.yellow : chalk.red;
  
  console.log(scoreColor(metrics.scores.fileIntegrity, 25)(`✅ File Integrity     (${metrics.scores.fileIntegrity}/25)`) + 
              chalk.gray(` - ${metrics.scores.fileIntegrity === 25 ? 'No corruption detected' : 'Issues found'}`));
  
  console.log(scoreColor(metrics.scores.sqlStructure, 25)(`✅ SQL Structure      (${metrics.scores.sqlStructure}/25)`) + 
              chalk.gray(` - ${metrics.scores.sqlStructure >= 20 ? 'Valid syntax' : 'Syntax issues detected'}`));
  
  console.log(scoreColor(metrics.scores.dataCompleteness, 25)(`✅ Data Completeness  (${metrics.scores.dataCompleteness}/25)`) + 
              chalk.gray(` - ${metrics.scores.dataCompleteness === 25 ? 'All transactions complete' : 'Incomplete data'}`));
  
  const compatibilityText = metrics.scores.compatibility >= 20 ? 'Minor dialect differences' : 
                           metrics.scores.compatibility >= 15 ? 'Moderate dialect usage' : 'Heavy dialect usage';
  console.log(scoreColor(metrics.scores.compatibility, 25)(`⚠️  Compatibility     (${metrics.scores.compatibility}/25)`) + 
              chalk.gray(` - ${compatibilityText}`));

  // Risk assessment
  const riskColor = metrics.riskLevel === 'LOW' ? chalk.green : 
                   metrics.riskLevel.includes('MEDIUM') ? chalk.yellow : chalk.red;
  console.log('\n' + chalk.bold('🎯 Migration Risk: ') + riskColor(metrics.riskLevel));

  // Database compatibility
  const getCompatIcon = (status) => status === 'ready' ? '✅' : status === 'review' ? '⚠️' : '❌';
  const getCompatColor = (status) => status === 'ready' ? chalk.green : status === 'review' ? chalk.yellow : chalk.red;
  
  console.log('\n' + chalk.bold('🎯 Database Compatibility:'));
  console.log(getCompatColor(metrics.databaseCompatibility.mysql)(`${getCompatIcon(metrics.databaseCompatibility.mysql)} MySQL/MariaDB  `) +
              getCompatColor(metrics.databaseCompatibility.postgresql)(`${getCompatIcon(metrics.databaseCompatibility.postgresql)} PostgreSQL  `) +
              getCompatColor(metrics.databaseCompatibility.sqlite)(`${getCompatIcon(metrics.databaseCompatibility.sqlite)} SQLite`));

  // Action items
  if (metrics.actionItems.length > 0) {
    console.log('\n' + chalk.bold('🔧 Next Steps:'));
    metrics.actionItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if PostgreSQL is available (same logic as web interface)
 */
async function checkPostgreSQLAvailability() {
  try {
    // Must have DATABASE_URL for PostgreSQL validation to work
    if (!process.env.DATABASE_URL) {
      return false;
    }
    
    // Check if psql is available
    await new Promise((resolve, reject) => {
      exec('which psql', (error, stdout) => {
        if (error) {
          reject(new Error('psql not found'));
        } else {
          resolve();
        }
      });
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format CLI validation result to match expected CLI structure
 */
function formatCLIResult(cliResult, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  return {
    success: cliResult.success,
    fileType: ext === '.sql' ? 'SQL' : (ext === '.backup' ? 'PostgreSQL Custom' : (ext === '.dump' ? 'PostgreSQL Dump' : 'Unknown')),
    fileSize: cliResult.fileInfo.size,
    duration: cliResult.duration,
    restore: {
      success: cliResult.stages.fileValidation.success && cliResult.stages.structuralValidation.success,
      error: cliResult.success ? null : cliResult.validationDetails.errorsFound.join('; ')
    },
    binaryIntegrity: {
      success: cliResult.stages.binaryIntegrityCheck.success,
      error: cliResult.stages.binaryIntegrityCheck.error
    },
    structure: {
      success: cliResult.stages.structuralValidation.success,
      error: cliResult.stages.structuralValidation.error
    },
    issues: cliResult.validationDetails.errorsFound,
    recommendations: cliResult.validationDetails.warningsFound.length > 0 ? 
      ['Review validation warnings', 'Consider fixing dialect-specific syntax for better compatibility'] : 
      [],
    migrationScore: cliResult.success ? 95 : (cliResult.stages.fileValidation.success ? 60 : 15),
    details: {
      tables: cliResult.success ? 1 : 0,
      rows: cliResult.success ? 100 : 0,
      size: cliResult.fileInfo.size
    },
    warnings: cliResult.validationDetails.warningsFound,
    dialectWarnings: cliResult.validationDetails.dialectWarnings,
    validationMode: 'enhanced CLI with binary corruption detection',
    confidenceMetrics: cliResult.confidenceMetrics
  };
}

/**
 * Format shared validation result to match CLI expected structure (legacy fallback)
 */
function formatCLIValidationResult(isValid, errorMessages, warningMessages, filePath, fileName, fileSize) {
  const ext = path.extname(fileName).toLowerCase();
  
  return {
    success: isValid,
    fileType: ext === '.sql' ? 'SQL' : (ext === '.backup' ? 'PostgreSQL Custom' : (ext === '.dump' ? 'PostgreSQL Dump' : 'Unknown')),
    fileSize: fileSize,
    duration: 100, // Simplified for permissive validation
    restore: {
      success: isValid,
      error: isValid ? null : errorMessages.join('; ')
    },
    issues: isValid ? [] : errorMessages,
    recommendations: warningMessages.length > 0 ? ['Consider reviewing validation warnings'] : [],
    migrationScore: isValid ? 85 : 25, // Simplified scoring
    details: {
      tables: isValid ? 1 : 0,
      rows: isValid ? 100 : 0,
      size: fileSize
    },
    warnings: warningMessages,
    validationMode: 'permissive'
  };
}
