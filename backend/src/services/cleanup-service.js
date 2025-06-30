const DockerRunner = require('./docker-runner');
const ResultStorage = require('./result-storage');

/**
 * Service responsible for cleaning up resources after backup validation
 */
class CleanupService {
  constructor() {
    this.dockerRunner = new DockerRunner();
    this.resultStorage = new ResultStorage();
  }

  /**
   * Perform comprehensive cleanup after a validation test
   * @param {object} validationContext - Context from validation process
   * @returns {Promise<object>} - Cleanup result summary
   */
  async cleanupAfterValidation(validationContext) {
    const cleanupResult = {
      containersRemoved: 0,
      tempFilesDeleted: 0,
      databaseRecordsExpired: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 1. Remove specific container if provided
      if (validationContext.containerName) {
        await this.cleanupContainer(validationContext.containerName, cleanupResult);
      }

      // 2. Clean up temporary files if provided
      if (validationContext.tempFiles && validationContext.tempFiles.length > 0) {
        await this.cleanupTempFiles(validationContext.tempFiles, cleanupResult);
      }

      // 3. Clean up orphaned test containers (containers older than 1 hour)
      await this.cleanupOrphanedContainers(cleanupResult);

      cleanupResult.duration = Date.now() - startTime;
      console.log(`🧹 Cleanup completed in ${cleanupResult.duration}ms`);

    } catch (error) {
      cleanupResult.errors.push(`Cleanup failed: ${error.message}`);
      console.error('❌ Cleanup error:', error.message);
    }

    return cleanupResult;
  }

  /**
   * Clean up a specific container
   * @private
   */
  async cleanupContainer(containerName, result) {
    try {
      await this.dockerRunner.removeContainer(containerName);
      result.containersRemoved++;
      console.log(`✅ Container removed: ${containerName}`);
    } catch (error) {
      result.errors.push(`Failed to remove container ${containerName}: ${error.message}`);
      console.error(`⚠️  Container cleanup warning: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   * @private
   */
  async cleanupTempFiles(tempFiles, result) {
    const fs = require('fs').promises;
    
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
        result.tempFilesDeleted++;
        console.log(`✅ Temp file removed: ${filePath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') { // Ignore "file not found" errors
          result.errors.push(`Failed to delete temp file ${filePath}: ${error.message}`);
          console.error(`⚠️  Temp file cleanup warning: ${error.message}`);
        }
      }
    }
  }

  /**
   * Clean up orphaned test containers (containers running longer than expected)
   * @private
   */
  async cleanupOrphanedContainers(result) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Find backup-guardian test containers older than 1 hour
      const findCommand = [
        'docker ps',
        '--filter "name=backup-guardian-test"',
        '--filter "status=running"',
        '--format "{{.Names}} {{.CreatedAt}}"'
      ].join(' ');

      const { stdout } = await execAsync(findCommand);
      const containers = stdout.trim().split('\n').filter(line => line);

      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      for (const containerLine of containers) {
        const [containerName, createdAt] = containerLine.split(' ', 2);
        const createdTime = new Date(createdAt).getTime();

        if (createdTime < oneHourAgo) {
          console.log(`🚨 Found orphaned container: ${containerName} (created ${createdAt})`);
          await this.cleanupContainer(containerName, result);
        }
      }

    } catch (error) {
      // Don't fail the whole cleanup if orphan cleanup fails
      console.error(`⚠️  Orphaned container cleanup warning: ${error.message}`);
    }
  }

  /**
   * Emergency cleanup - remove ALL backup guardian test containers
   * Use with caution - this will interrupt any running tests
   */
  async emergencyCleanup() {
    console.log('🚨 Performing EMERGENCY cleanup - this will stop ALL running tests!');
    
    const cleanupResult = {
      containersRemoved: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Get all backup guardian containers (running and stopped)
      const containers = await this.dockerRunner.listTestContainers();
      
      console.log(`Found ${containers.length} backup guardian containers`);
      
      for (const containerName of containers) {
        try {
          await this.dockerRunner.removeContainer(containerName);
          cleanupResult.containersRemoved++;
          console.log(`💥 Emergency removed: ${containerName}`);
        } catch (error) {
          cleanupResult.errors.push(`Failed to emergency remove ${containerName}: ${error.message}`);
        }
      }

      cleanupResult.duration = Date.now() - startTime;
      console.log(`🚨 Emergency cleanup completed: ${cleanupResult.containersRemoved} containers removed in ${cleanupResult.duration}ms`);

    } catch (error) {
      cleanupResult.errors.push(`Emergency cleanup failed: ${error.message}`);
      console.error('❌ Emergency cleanup error:', error.message);
    }

    return cleanupResult;
  }

  /**
   * Scheduled cleanup job - clean up old test data and containers
   * This should be run periodically (e.g., daily via cron)
   */
  async scheduledCleanup(options = {}) {
    const {
      maxTestRunAge = 90, // days
      maxTempFileAge = 7,  // days
      maxContainerAge = 1  // hours
    } = options;

    console.log(`🕐 Starting scheduled cleanup (test runs: ${maxTestRunAge}d, temp files: ${maxTempFileAge}d, containers: ${maxContainerAge}h)`);

    const cleanupResult = {
      containersRemoved: 0,
      tempFilesDeleted: 0,
      databaseRecordsExpired: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 1. Clean up old test run records from database
      try {
        const expiredRuns = await this.resultStorage.cleanupOldTestRuns(maxTestRunAge);
        cleanupResult.databaseRecordsExpired = expiredRuns;
        console.log(`🗄️  Cleaned up ${expiredRuns} old test run records`);
      } catch (error) {
        cleanupResult.errors.push(`Database cleanup failed: ${error.message}`);
      }

      // 2. Clean up orphaned containers
      await this.cleanupOrphanedContainers(cleanupResult);

      // 3. Clean up old temp files
      await this.cleanupOldTempFiles(maxTempFileAge, cleanupResult);

      cleanupResult.duration = Date.now() - startTime;
      console.log(`✅ Scheduled cleanup completed in ${cleanupResult.duration}ms`);

    } catch (error) {
      cleanupResult.errors.push(`Scheduled cleanup failed: ${error.message}`);
      console.error('❌ Scheduled cleanup error:', error.message);
    }

    return cleanupResult;
  }

  /**
   * Clean up old temporary files
   * @private
   */
  async cleanupOldTempFiles(maxAgeInDays, result) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const tempDirs = [
        path.join(__dirname, '../../temp'),
        path.join(__dirname, '../../uploads/temp'),
        '/tmp/backup-guardian' // System temp directory
      ];

      const maxAge = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);

      for (const tempDir of tempDirs) {
        try {
          const files = await fs.readdir(tempDir);
          
          for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < maxAge) {
              await fs.unlink(filePath);
              result.tempFilesDeleted++;
              console.log(`🗑️  Deleted old temp file: ${filePath}`);
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`⚠️  Temp directory cleanup warning: ${error.message}`);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Temp file cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get cleanup statistics and system health
   */
  async getCleanupStats() {
    const stats = {
      runningContainers: 0,
      totalContainers: 0,
      diskUsage: null,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };

    try {
      // Count running backup guardian containers
      const containers = await this.dockerRunner.listTestContainers();
      stats.totalContainers = containers.length;

      // Check how many are actually running
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const runningCommand = 'docker ps --filter "name=backup-guardian-test" --format "{{.Names}}"';
      const { stdout } = await execAsync(runningCommand);
      stats.runningContainers = stdout.trim().split('\n').filter(name => name).length;

    } catch (error) {
      console.error('⚠️  Stats collection warning:', error.message);
    }

    return stats;
  }
}

module.exports = CleanupService;
