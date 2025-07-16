const { query } = require('../db');

class SettingsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get a setting value by key
   * @param {string} key - Setting key
   * @returns {Promise<any>} - Parsed setting value
   */
  async getSetting(key) {
    await this.refreshCacheIfNeeded();
    
    const setting = this.cache.get(key);
    if (!setting) {
      throw new Error(`Setting '${key}' not found`);
    }
    
    return this.parseValue(setting.setting_value, setting.setting_type);
  }

  /**
   * Get multiple settings by keys
   * @param {string[]} keys - Array of setting keys
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async getSettings(keys) {
    await this.refreshCacheIfNeeded();
    
    const result = {};
    for (const key of keys) {
      const setting = this.cache.get(key);
      if (setting) {
        result[key] = this.parseValue(setting.setting_value, setting.setting_type);
      }
    }
    
    return result;
  }

  /**
   * Get all settings in a category
   * @param {string} category - Setting category
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async getSettingsByCategory(category) {
    await this.refreshCacheIfNeeded();
    
    const result = {};
    for (const [key, setting] of this.cache.entries()) {
      if (setting.category === category) {
        result[key] = this.parseValue(setting.setting_value, setting.setting_type);
      }
    }
    
    return result;
  }

  /**
   * Clear cache to force refresh
   */
  clearCache() {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Refresh cache if needed
   */
  async refreshCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTimeout || this.cache.size === 0) {
      await this.refreshCache();
    }
  }

  /**
   * Refresh cache from database
   */
  async refreshCache() {
    try {
      const result = await query(
        'SELECT setting_key, setting_value, setting_type, category FROM system_settings'
      );
      
      this.cache.clear();
      for (const setting of result.rows) {
        this.cache.set(setting.setting_key, setting);
      }
      
      this.lastCacheUpdate = Date.now();
      console.log(`✅ Settings cache refreshed with ${result.rows.length} settings`);
    } catch (error) {
      console.error('Failed to refresh settings cache:', error);
      
      // Defensive: Check if it's missing table error
      if (error.code === '42P01' && error.message.includes('system_settings')) {
        console.warn('⚠️  system_settings table missing - using fallback defaults');
        this.loadFallbackDefaults();
        return;
      }
      
      throw error;
    }
  }

  /**
   * Load fallback defaults when database table is missing
   */
  loadFallbackDefaults() {
    console.log('📋 Loading fallback default settings...');
    
    const fallbackSettings = [
      { setting_key: 'max_file_size_mb', setting_value: '500', setting_type: 'number', category: 'file_upload' },
      { setting_key: 'allowed_file_types', setting_value: '["sql", "dump", "backup", "tar", "gz", "zip"]', setting_type: 'json', category: 'file_upload' },
      { setting_key: 'storage_cleanup_days', setting_value: '30', setting_type: 'number', category: 'file_upload' },
      { setting_key: 'test_timeout_minutes', setting_value: '15', setting_type: 'number', category: 'test_execution' },
      { setting_key: 'max_concurrent_tests', setting_value: '3', setting_type: 'number', category: 'test_execution' },
      { setting_key: 'docker_container_timeout', setting_value: '10', setting_type: 'number', category: 'test_execution' },
      { setting_key: 'cleanup_temp_files_hours', setting_value: '24', setting_type: 'number', category: 'database_cleanup' },
      { setting_key: 'cleanup_failed_tests_days', setting_value: '7', setting_type: 'number', category: 'database_cleanup' },
      { setting_key: 'cleanup_logs_days', setting_value: '14', setting_type: 'number', category: 'database_cleanup' },
      { setting_key: 'session_timeout_hours', setting_value: '24', setting_type: 'number', category: 'security' },
      { setting_key: 'rate_limit_per_minute', setting_value: '60', setting_type: 'number', category: 'security' },
      { setting_key: 'system_version', setting_value: '1.0.0', setting_type: 'string', category: 'system' }
    ];

    this.cache.clear();
    for (const setting of fallbackSettings) {
      this.cache.set(setting.setting_key, setting);
    }
    
    this.lastCacheUpdate = Date.now();
    console.log(`✅ Loaded ${fallbackSettings.length} fallback settings`);
  }

  /**
   * Parse setting value based on type
   */
  parseValue(value, type) {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn(`Failed to parse JSON setting:`, e);
          return value;
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Convenience methods for common settings
   */
  async getMaxFileSize() {
    return await this.getSetting('max_file_size_mb');
  }

  async getAllowedFileTypes() {
    return await this.getSetting('allowed_file_types');
  }

  async getTestTimeout() {
    return await this.getSetting('test_timeout_minutes');
  }

  async getMaxConcurrentTests() {
    return await this.getSetting('max_concurrent_tests');
  }

  async getDockerTimeout() {
    return await this.getSetting('docker_container_timeout');
  }

  async getStorageCleanupDays() {
    return await this.getSetting('storage_cleanup_days');
  }

  async getCleanupSettings() {
    return await this.getSettingsByCategory('database_cleanup');
  }
}

// Export singleton instance
module.exports = new SettingsService();
