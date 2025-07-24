const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');
const { handleFirstRun } = require('./utils/firstRun');
const analytics = require('./utils/analytics');

// Import commands
const validateCommand = require('./commands/validate');
const versionCommand = require('./commands/version');
const demoCommand = require('./commands/demo');
const configCommand = require('./commands/config');

// Configure CLI
program
  .name('backup-guardian')
  .description('CLI tool for validating database backup files before migration')
  .version(pkg.version);

// Add commands
validateCommand(program);
versionCommand(program);
demoCommand(program);
configCommand(program);

// Global error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Error:'), reason);
  process.exit(1);
});

// Check for --disable-telemetry flag early
if (process.argv.includes('--disable-telemetry')) {
  analytics.setEnabled(false);
}

// Handle first run setup
async function main() {
  try {
    await handleFirstRun();
  } catch (error) {
    // Don't let first run setup break CLI
  }
  
  // Parse command line arguments
  program.parse();
}

// Run main function
main();
