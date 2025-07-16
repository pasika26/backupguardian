import { useState, useEffect } from 'react';
import './SystemSettings.css';

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeCategory, setActiveCategory] = useState('file_upload');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data.settings);
        setCategories(data.data.categories);
        if (data.data.categories.length > 0 && !activeCategory) {
          setActiveCategory(data.data.categories[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setSuccess(prev => ({ ...prev, [key]: null }));

    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        setSuccess(prev => ({ ...prev, [key]: 'Updated successfully!' }));
        // Refresh settings to get updated values
        await fetchSettings();
        setTimeout(() => {
          setSuccess(prev => ({ ...prev, [key]: null }));
        }, 3000);
      } else {
        const error = await response.json();
        setErrors(prev => ({ ...prev, [key]: error.message }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: 'Failed to update setting' }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const resetSetting = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));

    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/settings/${key}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess(prev => ({ ...prev, [key]: 'Reset to default!' }));
        await fetchSettings();
        setTimeout(() => {
          setSuccess(prev => ({ ...prev, [key]: null }));
        }, 3000);
      } else {
        const error = await response.json();
        setErrors(prev => ({ ...prev, [key]: error.message }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: 'Failed to reset setting' }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderSettingInput = (setting) => {
    const { setting_key, setting_type, parsed_value, description, is_editable } = setting;

    if (!is_editable) {
      return (
        <div className="setting-value readonly">
          {setting_type === 'json' ? JSON.stringify(parsed_value) : String(parsed_value)}
          <span className="readonly-label">Read Only</span>
        </div>
      );
    }

    const handleChange = (newValue) => {
      updateSetting(setting_key, newValue);
    };

    switch (setting_type) {
      case 'number':
        return (
          <input
            type="number"
            defaultValue={parsed_value}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value) && value !== parsed_value) {
                handleChange(value);
              }
            }}
            disabled={saving[setting_key]}
            className="setting-input"
          />
        );

      case 'boolean':
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={parsed_value}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={saving[setting_key]}
            />
            <span className="toggle-slider"></span>
          </label>
        );

      case 'json':
        return (
          <textarea
            defaultValue={JSON.stringify(parsed_value, null, 2)}
            onBlur={(e) => {
              try {
                const newValue = JSON.parse(e.target.value);
                if (JSON.stringify(newValue) !== JSON.stringify(parsed_value)) {
                  handleChange(newValue);
                }
              } catch (error) {
                setErrors(prev => ({ ...prev, [setting_key]: 'Invalid JSON format' }));
              }
            }}
            disabled={saving[setting_key]}
            className="setting-textarea"
            rows="3"
          />
        );

      case 'string':
      default:
        return (
          <input
            type="text"
            defaultValue={parsed_value}
            onBlur={(e) => {
              if (e.target.value !== parsed_value) {
                handleChange(e.target.value);
              }
            }}
            disabled={saving[setting_key]}
            className="setting-input"
          />
        );
    }
  };

  const getCategoryDisplayName = (category) => {
    const names = {
      'file_upload': 'File Upload',
      'test_execution': 'Test Execution',
      'database_cleanup': 'Database Cleanup',
      'security': 'Security',
      'system': 'System Info'
    };
    return names[category] || category;
  };

  if (loading) {
    return <div className="settings-loading">Loading system settings...</div>;
  }

  return (
    <div className="system-settings">
      <div className="settings-header">
        <h2>⚙️ System Settings</h2>
        <p>Configure BackupGuardian system parameters</p>
      </div>

      <div className="settings-tabs">
        {categories.map(category => (
          <button
            key={category}
            className={`settings-tab ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {getCategoryDisplayName(category)}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {settings[activeCategory] && (
          <div className="settings-category">
            <h3>{getCategoryDisplayName(activeCategory)}</h3>
            
            <div className="settings-list">
              {settings[activeCategory].map(setting => (
                <div key={setting.setting_key} className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="setting-description">
                      {setting.description}
                    </div>
                  </div>
                  
                  <div className="setting-controls">
                    <div className="setting-input-container">
                      {renderSettingInput(setting)}
                      {saving[setting.setting_key] && (
                        <div className="setting-spinner">⟳</div>
                      )}
                    </div>
                    
                    {setting.is_editable && (
                      <button
                        className="reset-button"
                        onClick={() => resetSetting(setting.setting_key)}
                        disabled={saving[setting.setting_key]}
                        title="Reset to default value"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                  
                  {errors[setting.setting_key] && (
                    <div className="setting-error">
                      {errors[setting.setting_key]}
                    </div>
                  )}
                  
                  {success[setting.setting_key] && (
                    <div className="setting-success">
                      {success[setting.setting_key]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
