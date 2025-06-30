import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0
  });
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsResponse, testsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/test-runs/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/test-runs?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!statsResponse.ok || !testsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsResponse.json();
      const testsData = await testsResponse.json();

      setStats(statsData);
      setRecentTests(testsData.data?.testRuns || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'pending': return '⏸️';
      default: return '❓';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p>Monitor your backup validation tests and system health</p>
        </div>
        <button 
          className="upload-button"
          onClick={() => onNavigate('upload')}
        >
          + Upload New Backup
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalTests}</div>
            <div className="stat-label">Total Tests</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.passedTests}</div>
            <div className="stat-label">Passed</div>
          </div>
        </div>

        <div className="stat-card error">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-number">{stats.failedTests}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pendingTests}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </div>

      <div className="recent-tests-section">
        <div className="section-header">
          <h2>Recent Test Results</h2>
          <button 
            className="view-all-button"
            onClick={() => onNavigate('history')}
          >
            View All
          </button>
        </div>

        {recentTests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No tests yet</h3>
            <p>Upload your first backup file to get started</p>
            <button 
              className="empty-action-button"
              onClick={() => onNavigate('upload')}
            >
              Upload Backup
            </button>
          </div>
        ) : (
          <div className="test-results-list">
            {recentTests.map((test) => (
              <div key={test.id} className="test-result-item">
                <div className="test-status">
                  <span 
                    className="status-icon"
                    style={{ color: getStatusColor(test.status) }}
                  >
                    {getStatusIcon(test.status)}
                  </span>
                  <span className="status-text">{test.status}</span>
                </div>
                
                <div className="test-info">
                  <div className="test-filename">{test.filename}</div>
                  <div className="test-details">
                    {test.fileSize && (
                      <span className="file-size">
                        {(test.fileSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                    <span className="test-date">{formatDate(test.createdAt)}</span>
                  </div>
                </div>

                <div className="test-duration">
                  {test.duration ? `${test.duration}s` : '-'}
                </div>

                <button className="test-details-button">
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
