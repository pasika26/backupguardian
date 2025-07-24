const fs = require('fs');
const path = require('path');
const os = require('os');

class OfflineAnalytics {
  constructor() {
    this.configDir = path.join(os.homedir(), '.backup-guardian');
    this.queueFile = path.join(this.configDir, 'analytics-queue.json');
    this.maxQueueSize = 100; // Prevent unlimited growth
  }

  // Queue analytics events when offline
  queueEvent(event, properties) {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Load existing queue
      let queue = [];
      if (fs.existsSync(this.queueFile)) {
        try {
          queue = JSON.parse(fs.readFileSync(this.queueFile, 'utf8'));
        } catch (e) {
          // If queue file is corrupted, start fresh
          queue = [];
        }
      }

      // Add new event
      queue.push({
        event,
        properties,
        queuedAt: new Date().toISOString()
      });

      // Limit queue size (keep most recent events)
      if (queue.length > this.maxQueueSize) {
        queue = queue.slice(-this.maxQueueSize);
      }

      // Save queue
      fs.writeFileSync(this.queueFile, JSON.stringify(queue, null, 2));
      
    } catch (error) {
      // Fail silently - offline analytics shouldn't break CLI
    }
  }

  // Get queued events
  getQueuedEvents() {
    try {
      if (!fs.existsSync(this.queueFile)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(this.queueFile, 'utf8'));
    } catch (error) {
      return [];
    }
  }

  // Clear the queue after successful sync
  clearQueue() {
    try {
      if (fs.existsSync(this.queueFile)) {
        fs.unlinkSync(this.queueFile);
      }
    } catch (error) {
      // Fail silently
    }
  }

  // Get queue stats for debugging
  getQueueStats() {
    const events = this.getQueuedEvents();
    return {
      count: events.length,
      oldestEvent: events.length > 0 ? events[0].queuedAt : null,
      newestEvent: events.length > 0 ? events[events.length - 1].queuedAt : null,
      size: this.getQueueFileSize()
    };
  }

  getQueueFileSize() {
    try {
      if (fs.existsSync(this.queueFile)) {
        return fs.statSync(this.queueFile).size;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new OfflineAnalytics();
