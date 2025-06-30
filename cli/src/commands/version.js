const chalk = require('chalk');
const pkg = require('../../package.json');

module.exports = (program) => {
  program
    .command('version')
    .description('Display version information')
    .action(() => {
      console.log(chalk.bold('🛡️  BackupGuardian CLI'));
      console.log(`Version: ${chalk.cyan(pkg.version)}`);
      console.log(`Node: ${chalk.gray(process.version)}`);
      console.log(`Platform: ${chalk.gray(process.platform)}`);
      console.log('');
      console.log(chalk.cyan('Homepage:'), pkg.homepage);
      console.log(chalk.cyan('Issues:'), pkg.bugs.url);
    });
};
