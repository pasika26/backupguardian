const Queue = require('bull');
const redis = require('redis');

// Queue for backup validation jobs
const validationQueue = new Queue('backup validation', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1',
    // password: process.env.REDIS_PASSWORD, // if needed
  }
});

// Import services for job processing
const BackupValidator = require('./backup-validator');
const ResultStorage = require('./result-storage');

class QueueService {
  constructor() {
    this.setupJobProcessing();
    this.setupEventHandlers();
  }

  // Add a new validation job to the queue
  async queueValidation(jobData) {
    try {
      const job = await validationQueue.add('validate-backup', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 20,     // Keep last 20 failed jobs
      });

      console.log(`✅ Validation job queued: ${job.id} for file: ${jobData.filename}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to queue validation job:', error);
      throw error;
    }
  }

  // Setup job processing
  setupJobProcessing() {
    validationQueue.process('validate-backup', 1, async (job) => {
      const { testRunId, filePath, filename, userId } = job.data;
      
      console.log(`🔄 Processing validation job ${job.id} for file: ${filename}`);
      
      try {
        // Update job progress
        await job.progress(10);
        
        // Update test run status to 'running'
        await ResultStorage.updateTestRun(testRunId, {
          status: 'running',
          started_at: new Date()
        });
        
        await job.progress(20);
        
        // Run the validation
        const validator = new BackupValidator();
        const validationResult = await validator.validateBackup(filePath, filename, (progress) => {
          // Update job progress during validation
          job.progress(20 + (progress * 0.7)); // 20-90% for validation
        });
        
        await job.progress(90);
        
        // Store the results
        const finalResult = await ResultStorage.updateTestRun(testRunId, {
          status: validationResult.success ? 'passed' : 'failed',
          completed_at: new Date(),
          duration_seconds: Math.round((Date.now() - new Date(job.data.startedAt)) / 1000),
          error_message: validationResult.errors?.length > 0 ? validationResult.errors.join('; ') : null
        });
        
        await job.progress(100);
        
        console.log(`✅ Validation completed for job ${job.id}: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
        
        return finalResult;
        
      } catch (error) {
        console.error(`❌ Validation failed for job ${job.id}:`, error);
        
        // Update test run with error
        await ResultStorage.updateTestRun(testRunId, {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date(),
          duration_seconds: Math.round((Date.now() - new Date(job.data.startedAt)) / 1000)
        });
        
        throw error;
      }
    });
  }

  // Setup event handlers for monitoring
  setupEventHandlers() {
    validationQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    validationQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    validationQueue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} stalled`);
    });

    validationQueue.on('progress', (job, progress) => {
      console.log(`🔄 Job ${job.id} progress: ${progress}%`);
    });
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        validationQueue.getWaiting(),
        validationQueue.getActive(),
        validationQueue.getCompleted(),
        validationQueue.getFailed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  // Get job details by ID
  async getJob(jobId) {
    try {
      return await validationQueue.getJob(jobId);
    } catch (error) {
      console.error(`Failed to get job ${jobId}:`, error);
      return null;
    }
  }

  // Clean up old jobs
  async cleanup() {
    try {
      await validationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 1 day
      await validationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 1 week
      console.log('✅ Queue cleanup completed');
    } catch (error) {
      console.error('❌ Queue cleanup failed:', error);
    }
  }

  // Graceful shutdown
  async close() {
    try {
      await validationQueue.close();
      console.log('✅ Queue service closed');
    } catch (error) {
      console.error('❌ Failed to close queue service:', error);
    }
  }
}

module.exports = new QueueService();
