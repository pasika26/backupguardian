import { useState, useEffect } from 'react';
import './History.css';

const TestHistory = ({ onNavigate }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    fetchTests();
  }, [currentPage, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateRange && { dateRange: filters.dateRange })
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/test-runs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed - redirecting to login');
          localStorage.removeItem('token');
          // Trigger a page reload to redirect to login
          window.location.reload();
          return;
        }
        throw new Error(`Failed to fetch test history: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      setTests(data.data?.testRuns || []);
      setTotalPages(data.data?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load test history:', error);
      setError('Failed to load test history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', dateRange: '', search: '' });
    setCurrentPage(1);
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
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const showTestDetails = (test) => {
    setSelectedTest(test);
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

  const closeTestDetails = () => {
    setSelectedTest(null);
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-content">
          <h1>Test History</h1>
          <p>View and manage your backup validation test results</p>
        </div>
        <button 
          className="upload-button"
          onClick={() => onNavigate('upload')}
        >
          + New Test
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range</label>
            <select 
              value={filters.dateRange} 
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by filename..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <button className="clear-filters-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading test history...</div>
      ) : tests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No tests found</h3>
          <p>No backup validation tests match your current filters</p>
        </div>
      ) : (
        <>
          <div className="tests-table">
            <div className="table-header">
              <div className="col-status">Status</div>
              <div className="col-filename">Filename</div>
              <div className="col-size">Size</div>
              <div className="col-duration">Duration</div>
              <div className="col-date">Date</div>
              <div className="col-actions">Actions</div>
            </div>

            {tests.map((test) => (
              <div key={test.id} className="table-row">
                <div className="col-status">
                  <span 
                    className="status-badge"
                    style={{ 
                      color: getStatusColor(test.status),
                      borderColor: getStatusColor(test.status)
                    }}
                  >
                    <span className="status-icon">{getStatusIcon(test.status)}</span>
                    {test.status}
                  </span>
                </div>
                
                <div className="col-filename">
                  <div className="filename-wrapper">
                    <span className="filename">{test.filename}</span>
                    {test.originalName && test.originalName !== test.filename && (
                      <span className="original-name">({test.originalName})</span>
                    )}
                  </div>
                </div>
                
                <div className="col-size">{formatFileSize(test.fileSize)}</div>
                
                <div className="col-duration">
                  {test.duration ? `${test.duration}s` : '-'}
                </div>
                
                <div className="col-date">{formatDate(test.createdAt)}</div>
                
                <div className="col-actions">
                  <div className="action-buttons">
                    <button 
                      className="details-button"
                      onClick={() => showTestDetails(test)}
                    >
                      Details
                    </button>
                    {(test.status === 'passed' || test.status === 'failed') && (
                      <div className="download-buttons">
                        <button 
                          className="download-button download-json"
                          onClick={() => handleDownloadReport(test.id, 'json')}
                          title="Download JSON Report"
                        >
                          📄
                        </button>
                        <button 
                          className="download-button download-pdf"
                          onClick={() => handleDownloadReport(test.id, 'pdf')}
                          title="Download PDF Report"
                        >
                          📋
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedTest && (
        <div className="modal-overlay" onClick={closeTestDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Test Details</h3>
              <button className="close-button" onClick={closeTestDetails}>×</button>
            </div>
            
            <div className="test-details">
              <div className="detail-row">
                <span className="label">Status:</span>
                <span 
                  className="value status"
                  style={{ color: getStatusColor(selectedTest.status) }}
                >
                  {getStatusIcon(selectedTest.status)} {selectedTest.status}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="label">Filename:</span>
                <span className="value">{selectedTest.filename}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">File Size:</span>
                <span className="value">{formatFileSize(selectedTest.fileSize)}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Duration:</span>
                <span className="value">
                  {selectedTest.duration ? `${selectedTest.duration} seconds` : 'N/A'}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="label">Started:</span>
                <span className="value">{formatDate(selectedTest.createdAt)}</span>
              </div>
              
              {selectedTest.completedAt && (
                <div className="detail-row">
                  <span className="label">Completed:</span>
                  <span className="value">{formatDate(selectedTest.completedAt)}</span>
                </div>
              )}
              
              {selectedTest.error && (
                <div className="detail-row">
                  <span className="label">Error:</span>
                  <span className="value error">{selectedTest.error}</span>
                </div>
              )}
              
              {selectedTest.results && (
                <div className="detail-row">
                  <span className="label">Results:</span>
                  <pre className="value results">{JSON.stringify(selectedTest.results, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHistory;
