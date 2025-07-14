import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Documentation.css';

function Documentation() {
  useEffect(() => {
    // Update page title for SEO
    document.title = 'Documentation | Backup Guardian - PostgreSQL Backup Validation Guide';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Complete guide to using Backup Guardian for PostgreSQL backup validation. Learn how to upload, validate, and monitor your database backups.');
    }
  }, []);

  return (
    <div className="docs-page">
      <div className="container">
        <header className="docs-header">
          <h1>Backup Guardian Documentation</h1>
          <p>Complete guide to PostgreSQL backup validation and monitoring</p>
        </header>

        <nav className="docs-nav">
          <h2>Quick Navigation</h2>
          <ul>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#uploading-backups">Uploading Backups</a></li>
            <li><a href="#validation-process">Validation Process</a></li>
            <li><a href="#reports">Understanding Reports</a></li>
            <li><a href="#cli-usage">CLI Usage</a></li>
            <li><a href="#api-reference">API Reference</a></li>
          </ul>
        </nav>

        <section id="getting-started" className="docs-section">
          <h2>Getting Started</h2>
          
          <div className="docs-content">
            <h3>What is Backup Guardian?</h3>
            <p>Backup Guardian is a PostgreSQL backup validation service that ensures your database backups are complete, uncorrupted, and restorable. It validates backup files through comprehensive testing in isolated environments.</p>

            <h3>Why Validate Backups?</h3>
            <ul>
              <li><strong>Silent Failures:</strong> Backup processes can fail silently, producing corrupt or incomplete files</li>
              <li><strong>Data Integrity:</strong> Ensure your backups actually contain all required data</li>
              <li><strong>Disaster Recovery:</strong> Validate that backups can be restored when needed</li>
              <li><strong>Compliance:</strong> Meet regulatory requirements for data protection</li>
            </ul>

            <h3>Supported Formats</h3>
            <p>Backup Guardian supports all major PostgreSQL backup formats:</p>
            <ul>
              <li>SQL dumps (pg_dump --format=plain)</li>
              <li>Custom format (pg_dump --format=custom)</li>
              <li>Tar format (pg_dump --format=tar)</li>
              <li>Directory format (pg_dump --format=directory)</li>
              <li>Base backups (pg_basebackup)</li>
            </ul>
          </div>
        </section>

        <section id="uploading-backups" className="docs-section">
          <h2>Uploading Backups</h2>
          
          <div className="docs-content">
            <h3>Web Interface</h3>
            <ol>
              <li>Navigate to the <Link to="/postgresql-backup-validation">Upload page</Link></li>
              <li>Drag and drop your backup file or click to browse</li>
              <li>Backup Guardian automatically detects the format</li>
              <li>Validation begins immediately with real-time progress</li>
            </ol>

            <h3>Supported File Sizes</h3>
            <p>Backup Guardian can handle backup files from small development databases (MB) to large production systems (TB+). Large files are processed using streaming validation to optimize memory usage.</p>

            <h3>Security During Upload</h3>
            <ul>
              <li>All uploads use encrypted HTTPS connections</li>
              <li>Files are stored in isolated, encrypted storage</li>
              <li>Validation occurs in sandboxed Docker containers</li>
              <li>Files are automatically deleted after validation</li>
            </ul>
          </div>
        </section>

        <section id="validation-process" className="docs-section">
          <h2>Validation Process</h2>
          
          <div className="docs-content">
            <h3>What Gets Validated</h3>
            <ul>
              <li><strong>File Integrity:</strong> Checksum verification and format validation</li>
              <li><strong>Schema Completeness:</strong> All tables, indexes, and constraints present</li>
              <li><strong>Data Integrity:</strong> Row counts and data consistency checks</li>
              <li><strong>Restore Testing:</strong> Actual restore operation in test environment</li>
            </ul>

            <h3>Validation Steps</h3>
            <ol>
              <li><strong>Upload Analysis:</strong> File format detection and initial validation</li>
              <li><strong>Environment Setup:</strong> Clean PostgreSQL container creation</li>
              <li><strong>Restore Operation:</strong> Full restore test with error monitoring</li>
              <li><strong>Data Verification:</strong> Schema and data integrity checks</li>
              <li><strong>Report Generation:</strong> Detailed results and recommendations</li>
              <li><strong>Cleanup:</strong> Secure deletion of temporary files and containers</li>
            </ol>

            <h3>Validation Results</h3>
            <p>Each validation produces a comprehensive report including:</p>
            <ul>
              <li>Overall health score (0-100)</li>
              <li>Detailed findings for each validation step</li>
              <li>Error details and resolution suggestions</li>
              <li>Performance metrics and timing</li>
              <li>Recommendations for backup process improvements</li>
            </ul>
          </div>
        </section>

        <section id="reports" className="docs-section">
          <h2>Understanding Reports</h2>
          
          <div className="docs-content">
            <h3>Report Sections</h3>
            
            <h4>Executive Summary</h4>
            <p>High-level overview including health score, validation status, and key findings.</p>

            <h4>Technical Details</h4>
            <ul>
              <li>Database schema validation results</li>
              <li>Data consistency check outcomes</li>
              <li>Performance metrics during restore</li>
              <li>File format and integrity analysis</li>
            </ul>

            <h4>Recommendations</h4>
            <p>Actionable suggestions for improving backup quality and reliability.</p>

            <h3>Report Formats</h3>
            <ul>
              <li><strong>PDF:</strong> Human-readable report for sharing and archiving</li>
              <li><strong>JSON:</strong> Machine-readable format for automation and integration</li>
              <li><strong>Dashboard:</strong> Interactive web interface for detailed analysis</li>
            </ul>
          </div>
        </section>

        <section id="cli-usage" className="docs-section">
          <h2>CLI Usage</h2>
          
          <div className="docs-content">
            <h3>Installation</h3>
            <pre className="code-block">
              <code>npm install -g backup-guardian</code>
            </pre>

            <h3>Basic Usage</h3>
            <pre className="code-block">
              <code>
{`# Validate a backup file
backup-guardian validate /path/to/backup.sql

# Validate with custom options
backup-guardian validate backup.sql --format json --output report.json

# Continuous validation
backup-guardian watch /backup/directory --schedule daily`}
              </code>
            </pre>

            <h3>CI/CD Integration</h3>
            <p>Integrate backup validation into your deployment pipeline:</p>
            <pre className="code-block">
              <code>
{`# GitHub Actions example
- name: Validate Database Backup
  run: |
    backup-guardian validate latest-backup.sql
    if [ $? -ne 0 ]; then
      echo "Backup validation failed"
      exit 1
    fi`}
              </code>
            </pre>
          </div>
        </section>

        <section id="api-reference" className="docs-section">
          <h2>API Reference</h2>
          
          <div className="docs-content">
            <h3>Authentication</h3>
            <p>All API requests require authentication using Bearer tokens:</p>
            <pre className="code-block">
              <code>Authorization: Bearer YOUR_API_TOKEN</code>
            </pre>

            <h3>Upload Endpoint</h3>
            <pre className="code-block">
              <code>
{`POST /api/upload
Content-Type: multipart/form-data

Response:
{
  "uploadId": "uuid",
  "status": "processing",
  "estimatedTime": "5-10 minutes"
}`}
              </code>
            </pre>

            <h3>Status Check</h3>
            <pre className="code-block">
              <code>
{`GET /api/validation/:uploadId

Response:
{
  "id": "uuid",
  "status": "completed",
  "healthScore": 95,
  "reportUrl": "/api/reports/:id"
}`}
              </code>
            </pre>
          </div>
        </section>

        <section className="docs-cta">
          <h2>Ready to Get Started?</h2>
          <p>Start validating your PostgreSQL backups today</p>
          <div className="cta-buttons">
            <Link to="/login" className="cta-button primary">Try Backup Guardian</Link>
            <Link to="/faq" className="cta-button secondary">View FAQ</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Documentation;
