import { useState, useEffect } from 'react';
import SystemSettings from './SystemSettings';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userActions, setUserActions] = useState({});

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';

      const [statsRes, usersRes, activityRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/stats`, { headers }),
        fetch(`${baseUrl}/api/admin/users`, { headers }),
        fetch(`${baseUrl}/api/admin/activity`, { headers })
      ]);

      if (statsRes.ok && usersRes.ok && activityRes.ok) {
        const [statsData, usersData, activityData] = await Promise.all([
          statsRes.json(),
          usersRes.json(),
          activityRes.json()
        ]);

        setStats(statsData.data);
        setUsers(usersData.data.users);
        setActivity(activityData.data.recentBackups);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setUserActions(prev => ({ ...prev, [userId]: 'toggling' }));
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh users data
        await fetchAdminData();
        setUserActions(prev => ({ ...prev, [userId]: null }));
      } else {
        throw new Error('Failed to toggle user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      setUserActions(prev => ({ ...prev, [userId]: 'error' }));
      setTimeout(() => {
        setUserActions(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setUserActions(prev => ({ ...prev, [userId]: 'deleting' }));
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app';
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh users data
        await fetchAdminData();
        setUserActions(prev => ({ ...prev, [userId]: null }));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error.message}`);
      setUserActions(prev => ({ ...prev, [userId]: 'error' }));
      setTimeout(() => {
        setUserActions(prev => ({ ...prev, [userId]: null }));
      }, 3000);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🔧 Admin Dashboard</h1>
        <p>Monitor BackupGuardian usage and users</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="admin-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>👥 Total Users</h3>
              <div className="stat-number">{stats.users.total}</div>
              <div className="stat-sub">+{stats.users.recent} this month</div>
            </div>
            
            <div className="stat-card">
              <h3>📦 Total Backups</h3>
              <div className="stat-number">{stats.backups.total}</div>
            </div>
            
            <div className="stat-card">
              <h3>🧪 Total Tests</h3>
              <div className="stat-number">{stats.tests.total}</div>
            </div>
            
            <div className="stat-card">
              <h3>✅ Success Rate</h3>
              <div className="stat-number">
                {stats.tests.total > 0 
                  ? Math.round((stats.tests.byStatus.passed || 0) / stats.tests.total * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <div className="test-status-breakdown">
            <h3>Test Status Breakdown</h3>
            <div className="status-grid">
              {Object.entries(stats.tests.byStatus).map(([status, count]) => (
                <div key={status} className={`status-item ${status}`}>
                  <span className="status-label">{status}</span>
                  <span className="status-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-users">
          <h3>All Users ({users.length})</h3>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Backups</th>
                  <th>Tests</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name || '-'}</td>
                    <td>{formatDate(user.joinedAt)}</td>
                    <td>{user.backupCount}</td>
                    <td>{user.testCount}</td>
                    <td>{formatDate(user.lastUpload || user.lastTest)}</td>
                    <td>
                      <div className="user-actions">
                        {userActions[user.id] === 'toggling' ? (
                          <span className="action-loading">⟳</span>
                        ) : (
                          <button
                            className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                            title={user.isActive ? 'Deactivate user' : 'Activate user'}
                          >
                            {user.isActive ? '🚫' : '✅'}
                          </button>
                        )}
                        
                        {userActions[user.id] === 'deleting' ? (
                          <span className="action-loading">⟳</span>
                        ) : (
                          <button
                            className="action-btn delete"
                            onClick={() => deleteUser(user.id)}
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        )}
                        
                        {userActions[user.id] === 'error' && (
                          <span className="action-error">❌</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="admin-activity">
          <h3>Recent Backup Uploads</h3>
          <div className="activity-list">
            {activity.map((item, index) => (
              <div key={index} className="activity-item">
                <div className="activity-info">
                  <div className="activity-file">{item.file_name}</div>
                  <div className="activity-user">{item.email}</div>
                </div>
                <div className="activity-meta">
                  <div className="activity-date">{formatDate(item.upload_date)}</div>
                  <div className={`activity-status ${item.test_status || 'pending'}`}>
                    {item.test_status || 'pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <SystemSettings />
      )}
    </div>
  );
};

export default AdminDashboard;
