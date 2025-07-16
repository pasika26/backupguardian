const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * Get all system settings
 * GET /api/settings
 */
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { category } = req.query;
    
    let sql = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        category,
        is_editable,
        updated_at
      FROM system_settings
    `;
    
    const params = [];
    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    
    sql += ' ORDER BY category, setting_key';
    
    const settings = await query(sql, params);
    
    // Group settings by category
    const groupedSettings = settings.rows.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      
      // Parse JSON values
      let parsedValue = setting.setting_value;
      if (setting.setting_type === 'json') {
        try {
          parsedValue = JSON.parse(setting.setting_value);
        } catch (e) {
          console.warn(`Failed to parse JSON setting ${setting.setting_key}:`, e);
        }
      } else if (setting.setting_type === 'number') {
        parsedValue = Number(setting.setting_value);
      } else if (setting.setting_type === 'boolean') {
        parsedValue = setting.setting_value === 'true';
      }
      
      acc[setting.category].push({
        ...setting,
        parsed_value: parsedValue
      });
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        settings: groupedSettings,
        categories: Object.keys(groupedSettings)
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific setting by key
 * GET /api/settings/:key
 */
router.get('/:key', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    
    const result = await query(
      'SELECT * FROM system_settings WHERE setting_key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    const setting = result.rows[0];
    
    // Parse value based on type
    let parsedValue = setting.setting_value;
    if (setting.setting_type === 'json') {
      try {
        parsedValue = JSON.parse(setting.setting_value);
      } catch (e) {
        console.warn(`Failed to parse JSON setting ${setting.setting_key}:`, e);
      }
    } else if (setting.setting_type === 'number') {
      parsedValue = Number(setting.setting_value);
    } else if (setting.setting_type === 'boolean') {
      parsedValue = setting.setting_value === 'true';
    }
    
    res.json({
      success: true,
      data: {
        setting: {
          ...setting,
          parsed_value: parsedValue
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Update a system setting
 * PUT /api/settings/:key
 */
router.put('/:key', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }
    
    // Check if setting exists and is editable
    const existingResult = await query(
      'SELECT setting_type, is_editable FROM system_settings WHERE setting_key = $1',
      [key]
    );
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    const existing = existingResult.rows[0];
    
    if (!existing.is_editable) {
      return res.status(403).json({
        success: false,
        message: 'This setting is not editable'
      });
    }
    
    // Validate and convert value based on type
    let stringValue;
    try {
      switch (existing.setting_type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            throw new Error('Invalid number format');
          }
          stringValue = numValue.toString();
          break;
          
        case 'boolean':
          stringValue = Boolean(value).toString();
          break;
          
        case 'json':
          // Validate JSON
          JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
          stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          break;
          
        case 'string':
        default:
          stringValue = String(value);
          break;
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid value for setting type ${existing.setting_type}: ${error.message}`
      });
    }
    
    // Update the setting
    const updateResult = await query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $3
       RETURNING *`,
      [stringValue, req.user.id, key]
    );
    
    const updatedSetting = updateResult.rows[0];
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: {
        setting: updatedSetting
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Reset a setting to its default value
 * POST /api/settings/:key/reset
 */
router.post('/:key/reset', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    
    // Get default values (you might want to store these in a separate table)
    const defaults = {
      'max_file_size_mb': '500',
      'allowed_file_types': '["sql", "dump", "backup", "tar", "gz", "zip"]',
      'storage_cleanup_days': '30',
      'test_timeout_minutes': '15',
      'max_concurrent_tests': '3',
      'docker_container_timeout': '10',
      'cleanup_temp_files_hours': '24',
      'cleanup_failed_tests_days': '7',
      'cleanup_logs_days': '14',
      'session_timeout_hours': '24',
      'rate_limit_per_minute': '60'
    };
    
    if (!defaults[key]) {
      return res.status(400).json({
        success: false,
        message: 'No default value available for this setting'
      });
    }
    
    const result = await query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $3 AND is_editable = true
       RETURNING *`,
      [defaults[key], req.user.id, key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found or not editable'
      });
    }
    
    res.json({
      success: true,
      message: 'Setting reset to default value',
      data: {
        setting: result.rows[0]
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
