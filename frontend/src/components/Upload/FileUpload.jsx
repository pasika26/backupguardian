import { useState, useRef } from 'react';
import './Upload.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['.sql', '.dump', '.backup'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (file.size > maxSize) {
      return 'File size must be less than 100MB';
    }

    if (!allowedTypes.includes(fileExtension)) {
      return 'Only .sql, .dump, and .backup files are allowed';
    }

    return null;
  };

  const uploadFile = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('backup', file);

    try {
      const token = localStorage.getItem('token');
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          setSuccess('File uploaded successfully! Validation will begin shortly.');
          onUploadSuccess && onUploadSuccess(response);
        } else {
          const error = JSON.parse(xhr.responseText);
          setError(error.message || 'Upload failed');
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        setError('Upload failed. Please check your connection.');
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.open('POST', 'http://localhost:3000/api/backups/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Upload Database Backup</h2>
        <p className="upload-subtitle">
          Upload your PostgreSQL backup file for validation testing
        </p>

        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          {uploading ? (
            <div className="upload-progress">
              <div className="progress-icon">📤</div>
              <div className="progress-text">Uploading...</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-percent">{uploadProgress}%</div>
            </div>
          ) : (
            <div className="upload-content">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <strong>Drop your backup file here</strong>
                <span>or click to browse</span>
              </div>
              <div className="upload-formats">
                Supports: .sql, .dump, .backup files (max 100MB)
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sql,.dump,.backup"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {error && (
          <div className="message error">
            <span className="message-icon">❌</span>
            {error}
          </div>
        )}

        {success && (
          <div className="message success">
            <span className="message-icon">✅</span>
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
