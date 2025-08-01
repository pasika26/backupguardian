const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const offlineAnalytics = require('./offline-analytics');

class Analytics {
  constructor() {
    this.configDir = path.join(os.homedir(), '.backup-guardian');
    this.configFile = path.join(this.configDir, 'config.json');
    this.apiEndpoint = process.env.ANALYTICS_ENDPOINT || 'https://backupguardian-production.up.railway.app/api/analytics/cli';
    this.enabled = true;
    this.machineId = null;
    
    this.initConfig();
  }

  initConfig() {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Load or create config
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.enabled = config.analytics !== false;
        this.machineId = config.machineId;
      } else {
        // Generate unique machine ID (anonymized)
        this.machineId = this.generateMachineId();
        this.saveConfig({ 
          machineId: this.machineId,
          analytics: true,
          firstRun: true 
        });
      }
    } catch (error) {
      // Fail silently - analytics shouldn't break CLI
      this.enabled = false;
    }
  }

  generateMachineId() {
    // Create anonymous machine ID based on hostname + username hash
    const data = os.hostname() + os.userInfo().username + os.platform();
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  saveConfig(config) {
    try {
      const existingConfig = fs.existsSync(this.configFile) 
        ? JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
        : {};
      
      const newConfig = { ...existingConfig, ...config };
      fs.writeFileSync(this.configFile, JSON.stringify(newConfig, null, 2));
    } catch (error) {
      // Fail silently
    }
  }

  async track(event, properties = {}) {
    if (!this.enabled) return;

    try {
      const payload = {
        event,
        properties: {
          ...properties,
          machineId: this.machineId,
          os: os.platform(),
          osVersion: os.release(),
          nodeVersion: process.version,
          cliVersion: require('../../package.json').version,
          timestamp: new Date().toISOString()
        }
      };

      // Send async without blocking CLI
      this.sendAnalytics(payload).catch(() => {
        // Fail silently - don't let analytics break CLI
      });
    } catch (error) {
      // Fail silently
    }
  }

  async sendAnalytics(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.apiEndpoint);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': `backup-guardian-cli/${require('../../package.json').version}`
        },
        timeout: 5000 // 5 second timeout
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {}); // Consume response
        res.on('end', () => resolve());
      });

      req.on('error', (error) => {
        // Queue for later if network is unavailable
        offlineAnalytics.queueEvent(payload.event, payload.properties);
        reject(error);
      });
      
      req.on('timeout', (error) => {
        // Queue for later if request times out
        offlineAnalytics.queueEvent(payload.event, payload.properties);
        reject(error);
      });
      
      req.write(data);
      req.end();
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.saveConfig({ analytics: enabled });
  }

  isFirstRun() {
    try {
      if (!fs.existsSync(this.configFile)) return true;
      const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      return config.firstRun === true;
    } catch {
      return true;
    }
  }

  markFirstRunComplete() {
    this.saveConfig({ firstRun: false });
  }

  getStatus() {
    const queueStats = offlineAnalytics.getQueueStats();
    return {
      enabled: this.enabled,
      machineId: this.machineId,
      configFile: this.configFile,
      queuedEvents: queueStats.count,
      queueSize: queueStats.size
    };
  }

  // Sync queued events when online
  async syncQueuedEvents() {
    if (!this.enabled) return { synced: 0, failed: 0 };
    
    const queuedEvents = offlineAnalytics.getQueuedEvents();
    if (queuedEvents.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const queuedEvent of queuedEvents) {
      try {
        const payload = {
          event: queuedEvent.event,
          properties: {
            ...queuedEvent.properties,
            queued: true,
            queuedAt: queuedEvent.queuedAt,
            syncedAt: new Date().toISOString()
          }
        };
        
        await this.sendAnalytics(payload);
        synced++;
      } catch (error) {
        failed++;
        // Stop trying if we're clearly offline
        if (failed >= 3) break;
      }
    }

    // Clear queue if all events synced successfully
    if (failed === 0) {
      offlineAnalytics.clearQueue();
    }

    return { synced, failed, total: queuedEvents.length };
  }
}

module.exports = new Analytics();
