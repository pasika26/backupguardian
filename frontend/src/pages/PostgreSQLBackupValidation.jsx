import FileUpload from '../components/Upload/FileUpload';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function PostgreSQLBackupValidation() {
  const navigate = useNavigate();

  useEffect(() => {
    // Update page title for SEO
    document.title = 'PostgreSQL Backup Validation | Backup Guardian';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Validate your PostgreSQL backup files instantly. Upload and test your database backups for integrity, format compliance, and data completeness.');
    }
  }, []);

  const handleUploadSuccess = () => {
    navigate('/database-backup-monitoring');
  };

  return <FileUpload onUploadSuccess={handleUploadSuccess} />;
}

export default PostgreSQLBackupValidation;
