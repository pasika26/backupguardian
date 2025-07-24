const chalk = require('chalk');
const analytics = require('../utils/analytics');

module.exports = (program) => {
  program
    .command('config')
    .description('Configure CLI settings')
    .option('--enable-telemetry', 'Enable anonymous usage analytics')
    .option('--disable-telemetry', 'Disable anonymous usage analytics')
    .option('--status', 'Show current configuration status')
    .action(async (options) => {
      if (options.enableTelemetry) {
        analytics.setEnabled(true);
        console.log(chalk.green('✅ Anonymous analytics enabled'));
        console.log(chalk.gray('Thank you for helping us improve BackupGuardian!'));
        
        await analytics.track('telemetry_enabled');
      } else if (options.disableTelemetry) {
        analytics.setEnabled(false);
        console.log(chalk.yellow('📊 Anonymous analytics disabled'));
        console.log(chalk.gray('You can re-enable anytime with: backup-guardian config --enable-telemetry'));
      } else if (options.status) {
        const status = analytics.getStatus();
        
        console.log(chalk.bold('🛡️  BackupGuardian CLI Configuration'));
        console.log(chalk.gray('━'.repeat(40)));
        console.log(chalk.cyan('Analytics:'), status.enabled ? chalk.green('Enabled') : chalk.red('Disabled'));
        console.log(chalk.cyan('Machine ID:'), chalk.gray(status.machineId));
        console.log(chalk.cyan('Config File:'), chalk.gray(status.configFile));
        
        if (status.enabled) {
          console.log('\n' + chalk.gray('Data collected: command usage, success/failure rates, OS info'));
          console.log(chalk.gray('Data NOT collected: file contents, credentials, personal info'));
        }
      } else {
        console.log(chalk.yellow('Please specify an option:'));
        console.log('  --enable-telemetry   Enable analytics');
        console.log('  --disable-telemetry  Disable analytics');
        console.log('  --status            Show current settings');
      }
    });
};
