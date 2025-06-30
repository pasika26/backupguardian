const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// Import commands
const validateCommand = require('./commands/validate');
const versionCommand = require('./commands/version');
const demoCommand = require('./commands/demo');

// Configure CLI
program
  .name('backup-guardian')
  .description('CLI tool for validating database backup files before migration')
  .version(pkg.version);

// Add commands
validateCommand(program);
versionCommand(program);
demoCommand(program);

// Global error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Error:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
