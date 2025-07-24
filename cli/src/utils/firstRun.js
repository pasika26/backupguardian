const inquirer = require('inquirer');
const chalk = require('chalk');
const analytics = require('./analytics');

async function handleFirstRun() {
  if (!analytics.isFirstRun()) {
    return;
  }

  console.log(chalk.blue('\n🛡️  Welcome to Backup Guardian CLI!\n'));
  
  console.log('To help us improve the tool, we collect anonymous usage data including:');
  console.log('• Commands used (validate, demo, version)');
  console.log('• Success/failure rates');
  console.log('• Operating system and Node.js version');
  console.log('• Performance metrics\n');
  
  console.log(chalk.gray('No personal information, file contents, or database credentials are collected.'));
  console.log(chalk.gray('You can opt-out anytime with: backup-guardian config --disable-telemetry\n'));

  const { allowAnalytics } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'allowAnalytics',
      message: 'Allow anonymous usage analytics?',
      default: true
    }
  ]);

  analytics.setEnabled(allowAnalytics);
  analytics.markFirstRunComplete();

  if (allowAnalytics) {
    console.log(chalk.green('✅ Analytics enabled. Thank you for helping us improve!\n'));
    await analytics.track('first_run', { opted_in: true });
  } else {
    console.log(chalk.yellow('📊 Analytics disabled. You can enable them later if you change your mind.\n'));
  }
}

module.exports = { handleFirstRun };
