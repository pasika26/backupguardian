const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// Import validation services from backend
const BackupValidator = require('../../../backend/src/services/backup-validator');

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
  
  // Initialize spinner
  const spinner = ora(`Validating ${fileName}...`).start();
  
  try {
    // Initialize backup validator
    const validator = new BackupValidator();
    
    // Configure validation options
    const validationOptions = {
      enableSchemaValidation: options.schemaCheck,
      enableDataValidation: options.dataCheck,
      databaseType: options.type === 'auto' ? null : options.type
    };

    // Update spinner
    spinner.text = 'Starting Docker container...';

    // Perform validation
    const result = await validator.validateBackup(absolutePath, validationOptions);
    
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
  
  // Overall status
  const statusIcon = result.success ? '✅' : '❌';
  const statusColor = result.success ? chalk.green : chalk.red;
  console.log('\n' + statusColor(statusIcon + ' Overall Status:'), statusColor(result.success ? 'PASSED' : 'FAILED'));
  
  // Validation stages
  if (result.restore) {
    displayStageResult('Database Restore', result.restore);
  }
  
  if (result.schema) {
    displayStageResult('Schema Validation', result.schema);
  }
  
  if (result.data) {
    displayStageResult('Data Validation', result.data);
  }
  
  // Issues and recommendations
  if (result.issues && result.issues.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  Issues Found:'));
    result.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  if (result.recommendations && result.recommendations.length > 0) {
    console.log('\n' + chalk.blue('💡 Recommendations:'));
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
