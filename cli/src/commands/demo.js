const chalk = require('chalk');
const ora = require('ora');

module.exports = (program) => {
  program
    .command('demo')
    .description('Run a demo validation (no Docker required)')
    .argument('<file>', 'Path to the backup file to demo')
    .option('--json', 'Output results in JSON format', false)
    .action(async (file, options) => {
      await runDemo(file, options);
    });
};

async function runDemo(filePath, options) {
  const fileName = require('path').basename(filePath);
  
  // Simulate validation process
  const spinner = ora(`Validating ${fileName}...`).start();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.text = 'Analyzing file structure...';
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  spinner.text = 'Running validation checks...';
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  spinner.stop();
  
  // Mock successful result
  const result = {
    success: true,
    fileType: '.sql',
    fileSize: 2763742,
    duration: 3500,
    migrationScore: 85,
    restore: { success: true },
    schema: { success: true },
    data: { success: true },
    details: {
      tables: 15,
      rows: 12847,
      size: 2.6 * 1024 * 1024
    },
    recommendations: [
      'Consider adding indexes on foreign key columns',
      'Review large table partitioning strategy'
    ]
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    displayDemoResults(result, fileName);
  }
}

function displayDemoResults(result, fileName) {
  console.log('\n' + chalk.bold('🛡️  BackupGuardian Validation Report'));
  console.log(chalk.gray('━'.repeat(50)));
  
  // File info
  console.log(chalk.cyan('File:'), fileName);
  console.log(chalk.cyan('Type:'), result.fileType);
  console.log(chalk.cyan('Size:'), '2.64 MB');
  console.log(chalk.cyan('Duration:'), `${result.duration}ms`);
  
  // Overall status
  console.log('\n' + chalk.green('✅ Overall Status: PASSED'));
  
  // Validation stages
  console.log(chalk.green('✅ Database Restore: PASSED'));
  console.log(chalk.green('✅ Schema Validation: PASSED'));
  console.log(chalk.green('✅ Data Validation: PASSED'));
  
  // Recommendations
  console.log('\n' + chalk.blue('💡 Recommendations:'));
  result.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
  
  // Migration readiness score
  console.log('\n' + chalk.bold('📊 Migration Readiness Score:'), chalk.green(`${result.migrationScore}/100`));
  
  // Details
  console.log('\n' + chalk.gray('📋 Detailed Information:'));
  console.log(chalk.gray(`  • Tables found: ${result.details.tables}`));
  console.log(chalk.gray(`  • Total rows: ${result.details.rows.toLocaleString()}`));
  console.log(chalk.gray(`  • Database size: 2.64 MB`));
  
  // Demo notice
  console.log('\n' + chalk.yellow('⚠️  This is a demo validation result'));
  console.log(chalk.yellow('   Install Docker for real validation testing'));
  
  // Web app promotion
  console.log('\n' + chalk.gray('━'.repeat(50)));
  console.log(chalk.cyan('💻 Want to save validation history and collaborate with your team?'));
  console.log(chalk.cyan('   Visit: https://backup-guardian.com'));
  console.log('');
}
