import { useState, useEffect } from 'react';
import AuthContainer from './components/Auth/AuthContainer';
import Dashboard from './components/Dashboard/Dashboard';
import FileUpload from './components/Upload/FileUpload';
import TestHistory from './components/History/TestHistory';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
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
      const response = await fetch('http://localhost:3000/api/users/profile', {
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
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  const handleUploadSuccess = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading BackupGuardian...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>🛡️ BackupGuardian</h1>
          </div>
          
          <div className="nav-links">
            <button 
              className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavigation('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-link ${currentView === 'upload' ? 'active' : ''}`}
              onClick={() => handleNavigation('upload')}
            >
              Upload
            </button>
            <button 
              className={`nav-link ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => handleNavigation('history')}
            >
              History
            </button>
          </div>

          <div className="nav-user">
            <span className="user-name">Hi, {user.name}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="app-main">
        {currentView === 'dashboard' && (
          <Dashboard user={user} onNavigate={handleNavigation} />
        )}
        {currentView === 'upload' && (
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        )}
        {currentView === 'history' && (
          <TestHistory onNavigate={handleNavigation} />
        )}
      </main>
    </div>
  );
}

export default App;
