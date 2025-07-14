import TestHistory from '../components/History/TestHistory';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function BackupHistory() {
  const navigate = useNavigate();

  useEffect(() => {
    // Update page title for SEO
    document.title = 'Backup Test History | Backup Guardian';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'View your complete backup validation history. Track test results, download reports, and monitor backup health over time.');
    }
  }, []);

  const handleNavigate = (view) => {
    switch(view) {
      case 'upload':
        navigate('/postgresql-backup-validation');
        break;
      case 'dashboard':
        navigate('/database-backup-monitoring');
        break;
      default:
        navigate('/backup-history');
    }
  };

  return <TestHistory onNavigate={handleNavigate} />;
}

export default BackupHistory;
