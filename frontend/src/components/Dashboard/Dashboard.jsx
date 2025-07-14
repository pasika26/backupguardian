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
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsResponse, testsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/test-runs/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/test-runs?limit=5`, {
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
    if (!dateString) return 'No date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = async (test) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/test-runs/${test.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedTest(data.data.testRun);
        setShowDetailsModal(true);
      } else {
        console.error('Failed to fetch test details');
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedTest(null);
  };

  const handleDownloadReport = async (testId, format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/test-runs/${testId}/report/${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-validation-report-${testId}.${format === 'pdf' ? 'html' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
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

                <div className="test-actions">
                  <button 
                    className="test-details-button"
                    onClick={() => handleViewDetails(test)}
                  >
                    View Details
                  </button>
                  {test.status === 'passed' || test.status === 'failed' ? (
                    <div className="download-buttons">
                      <button 
                        className="download-button download-json"
                        onClick={() => handleDownloadReport(test.id, 'json')}
                        title="Download JSON Report"
                      >
                        📄 JSON
                      </button>
                      <button 
                        className="download-button download-pdf"
                        onClick={() => handleDownloadReport(test.id, 'pdf')}
                        title="Download PDF Report"
                      >
                        📋 PDF
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Details Modal */}
      {showDetailsModal && selectedTest && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🛡️ Test Details</h2>
              <button className="modal-close" onClick={closeDetailsModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="test-details-grid">
                {/* Basic Info */}
                <div className="details-section">
                  <h3>📁 File Information</h3>
                  <div className="details-row">
                    <span className="label">Filename:</span>
                    <span className="value">{selectedTest.filename}</span>
                  </div>
                  <div className="details-row">
                    <span className="label">File Size:</span>
                    <span className="value">
                      {selectedTest.fileSize ? (selectedTest.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown'}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="label">Status:</span>
                    <span className={`value status-${selectedTest.status}`}>
                      {getStatusIcon(selectedTest.status)} {selectedTest.status}
                    </span>
                  </div>
                </div>

                {/* Timing Info */}
                <div className="details-section">
                  <h3>⏱️ Timing</h3>
                  <div className="details-row">
                    <span className="label">Started:</span>
                    <span className="value">{formatDate(selectedTest.createdAt)}</span>
                  </div>
                  <div className="details-row">
                    <span className="label">Completed:</span>
                    <span className="value">{formatDate(selectedTest.completedAt)}</span>
                  </div>
                  <div className="details-row">
                    <span className="label">Duration:</span>
                    <span className="value">{selectedTest.duration ? `${selectedTest.duration}s` : 'N/A'}</span>
                  </div>
                </div>

                {/* Database Info */}
                <div className="details-section">
                  <h3>🗄️ Database</h3>
                  <div className="details-row">
                    <span className="label">Test Database:</span>
                    <span className="value">{selectedTest.test_database_name || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="label">Results Count:</span>
                    <span className="value">{selectedTest.result_count || 0}</span>
                  </div>
                </div>

                {/* Error Info (if failed) */}
                {selectedTest.status === 'failed' && selectedTest.error_message && (
                  <div className="details-section error-section">
                    <h3>❌ Error Details</h3>
                    <div className="error-message">
                      {selectedTest.error_message}
                    </div>
                  </div>
                )}
              </div>

              {/* Mock validation results for demo */}
              <div className="validation-results">
                <h3>📊 Validation Results</h3>
                <div className="validation-stages">
                  <div className="stage-item">
                    <span className="stage-icon">✅</span>
                    <span className="stage-name">File Structure</span>
                    <span className="stage-status">Passed</span>
                  </div>
                  <div className="stage-item">
                    <span className="stage-icon">✅</span>
                    <span className="stage-name">Database Restore</span>
                    <span className="stage-status">Passed</span>
                  </div>
                  <div className="stage-item">
                    <span className="stage-icon">✅</span>
                    <span className="stage-name">Schema Validation</span>
                    <span className="stage-status">Passed</span>
                  </div>
                  <div className="stage-item">
                    <span className="stage-icon">✅</span>
                    <span className="stage-name">Data Integrity</span>
                    <span className="stage-status">Passed</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeDetailsModal}>Close</button>
              {(selectedTest.status === 'passed' || selectedTest.status === 'failed') && (
                <div className="modal-download-buttons">
                  <button 
                    className="btn-download btn-json"
                    onClick={() => handleDownloadReport(selectedTest.id, 'json')}
                  >
                    📄 Download JSON
                  </button>
                  <button 
                    className="btn-download btn-pdf"
                    onClick={() => handleDownloadReport(selectedTest.id, 'pdf')}
                  >
                    📋 Download PDF
                  </button>
                </div>
              )}
              <button className="btn-primary" onClick={() => onNavigate('history')}>View All Tests</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
