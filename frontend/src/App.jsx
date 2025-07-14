import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import AuthContainer from './components/Auth/AuthContainer';
import LandingPage from './components/Landing/LandingPage';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import TermsOfUse from './components/Legal/TermsOfUse';
import DatabaseBackupMonitoring from './pages/DatabaseBackupMonitoring';
import PostgreSQLBackupValidation from './pages/PostgreSQLBackupValidation';
import BackupHistory from './pages/BackupHistory';
import Features from './pages/Features';
import FAQ from './pages/FAQ';
import AdminDashboard from './components/Admin/AdminDashboard';
import './App.css';

// Navigation component for authenticated users
function Navigation({ user, onLogout }) {
  const location = useLocation();
  
  return (
    <nav className="app-nav">
      <div className="nav-content">
        <div className="nav-brand">
          <Link to="/">
            <h1>🛡️ Backup Guardian</h1>
          </Link>
        </div>
        
        <div className="nav-links">
          <Link 
            to="/database-backup-monitoring" 
            className={`nav-link ${location.pathname === '/database-backup-monitoring' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/postgresql-backup-validation" 
            className={`nav-link ${location.pathname === '/postgresql-backup-validation' ? 'active' : ''}`}
          >
            Upload
          </Link>
          <Link 
            to="/backup-history" 
            className={`nav-link ${location.pathname === '/backup-history' ? 'active' : ''}`}
          >
            History
          </Link>
          <Link 
            to="/features" 
            className={`nav-link ${location.pathname === '/features' ? 'active' : ''}`}
          >
            Features
          </Link>
          <Link 
            to="/admin" 
            className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            🔧 Admin
          </Link>
        </div>

        <div className="nav-user">
          <span className="user-name">Hi, {user.name}</span>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://backupguardian-production.up.railway.app'}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading Backup Guardian...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<Features />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/login" element={<AuthContainer onLogin={handleLogin} />} />
          
          {/* Protected routes */}
          <Route path="/database-backup-monitoring" element={
            user ? (
              <>
                <Navigation user={user} onLogout={handleLogout} />
                <main className="app-main">
                  <DatabaseBackupMonitoring user={user} />
                </main>
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/postgresql-backup-validation" element={
            user ? (
              <>
                <Navigation user={user} onLogout={handleLogout} />
                <main className="app-main">
                  <PostgreSQLBackupValidation />
                </main>
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/backup-history" element={
            user ? (
              <>
                <Navigation user={user} onLogout={handleLogout} />
                <main className="app-main">
                  <BackupHistory />
                </main>
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/admin" element={
            user ? (
              <>
                <Navigation user={user} onLogout={handleLogout} />
                <main className="app-main">
                  <AdminDashboard />
                </main>
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          {/* Redirect old URLs */}
          <Route path="/dashboard" element={<Navigate to="/database-backup-monitoring" />} />
          <Route path="/upload" element={<Navigate to="/postgresql-backup-validation" />} />
          <Route path="/history" element={<Navigate to="/backup-history" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
