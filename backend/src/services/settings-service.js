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
    } catch (error) {
      console.error('Failed to refresh settings cache:', error);
      throw error;
    }
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
