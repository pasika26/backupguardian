import Dashboard from '../components/Dashboard/Dashboard';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function DatabaseBackupMonitoring({ user }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Update page title for SEO
    document.title = 'Database Backup Monitoring | Backup Guardian';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Monitor your database backups in real-time with Backup Guardian. Get instant alerts, health checks, and comprehensive backup validation.');
    }
  }, []);

  const handleNavigate = (view) => {
    switch(view) {
      case 'upload':
        navigate('/postgresql-backup-validation');
        break;
      case 'history':
        navigate('/backup-history');
        break;
      default:
        navigate('/database-backup-monitoring');
    }
  };

  return <Dashboard user={user} onNavigate={handleNavigate} />;
}

export default DatabaseBackupMonitoring;
