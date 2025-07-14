import { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
    </div>
  );
};

export default AdminDashboard;
