import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CLI.css';

function CLI() {
  useEffect(() => {
    // Update page title for SEO
    document.title = 'CLI Tool | Backup Guardian - Command Line PostgreSQL Backup Validation';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Backup Guardian CLI tool for automated PostgreSQL backup validation. Integrate backup testing into CI/CD pipelines and scripts.');
    }
  }, []);

  return (
    <div className="cli-page">
      <div className="container">
        <header className="cli-header">
          <div className="terminal-icon">⌨️</div>
          <h1>Backup Guardian CLI</h1>
          <p>Command-line tool for automated PostgreSQL backup validation</p>
        </header>

        <section className="installation-section">
          <h2>Quick Installation</h2>
          <div className="install-commands">
            <div className="install-method">
              <h3>NPM (Recommended)</h3>
              <div className="code-block">
                <code>npm install -g backup-guardian</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('npm install -g backup-guardian')}>
                  📋 Copy
                </button>
              </div>
            </div>
            
            <div className="install-method">
              <h3>Yarn</h3>
              <div className="code-block">
                <code>yarn global add backup-guardian</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('yarn global add backup-guardian')}>
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="install-method">
              <h3>Direct Download</h3>
              <div className="download-links">
                <a href="/downloads/backup-guardian-linux" className="download-btn">Linux x64</a>
                <a href="/downloads/backup-guardian-macos" className="download-btn">macOS</a>
                <a href="/downloads/backup-guardian-windows.exe" className="download-btn">Windows</a>
              </div>
            </div>
          </div>
        </section>

        <section className="usage-section">
          <h2>Basic Usage</h2>
          
          <div className="command-examples">
            <div className="command-group">
              <h3>Validate a Single Backup</h3>
              <div className="code-block">
                <code>backup-guardian validate /path/to/backup.sql</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('backup-guardian validate /path/to/backup.sql')}>
                  📋 Copy
                </button>
              </div>
              <p>Validates a single PostgreSQL backup file and displays results in the terminal.</p>
            </div>

            <div className="command-group">
              <h3>Generate JSON Report</h3>
              <div className="code-block">
                <code>backup-guardian validate backup.sql --format json --output report.json</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('backup-guardian validate backup.sql --format json --output report.json')}>
                  📋 Copy
                </button>
              </div>
              <p>Validates backup and saves detailed results as a JSON file for automation.</p>
            </div>

            <div className="command-group">
              <h3>Watch Directory</h3>
              <div className="code-block">
                <code>backup-guardian watch /backup/directory --schedule daily</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('backup-guardian watch /backup/directory --schedule daily')}>
                  📋 Copy
                </button>
              </div>
              <p>Continuously monitors a directory for new backups and validates them automatically.</p>
            </div>
          </div>
        </section>

        <section className="cicd-section">
          <h2>CI/CD Integration</h2>
          
          <div className="integration-examples">
            <div className="integration-card">
              <h3>GitHub Actions</h3>
              <div className="code-block">
                <code>{`name: Validate Database Backup
on: [push, pull_request]

jobs:
  validate-backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Backup Guardian
        run: npm install -g backup-guardian
        
      - name: Validate Backup
        run: |
          backup-guardian validate backup.sql
          if [ $? -ne 0 ]; then
            echo "Backup validation failed"
            exit 1
          fi`}</code>
                <button className="copy-btn">📋 Copy</button>
              </div>
            </div>

            <div className="integration-card">
              <h3>GitLab CI</h3>
              <div className="code-block">
                <code>{`validate_backup:
  stage: test
  image: node:18
  script:
    - npm install -g backup-guardian
    - backup-guardian validate backup.sql --format json
  artifacts:
    reports:
      junit: validation-report.json`}</code>
                <button className="copy-btn">📋 Copy</button>
              </div>
            </div>

            <div className="integration-card">
              <h3>Jenkins Pipeline</h3>
              <div className="code-block">
                <code>{`pipeline {
    agent any
    stages {
        stage('Validate Backup') {
            steps {
                sh 'npm install -g backup-guardian'
                sh 'backup-guardian validate backup.sql'
            }
        }
    }
}`}</code>
                <button className="copy-btn">📋 Copy</button>
              </div>
            </div>
          </div>
        </section>

        <section className="commands-section">
          <h2>All Commands</h2>
          
          <div className="commands-grid">
            <div className="command-card">
              <h4>validate</h4>
              <p>Validate a PostgreSQL backup file</p>
              <code>backup-guardian validate [file]</code>
            </div>

            <div className="command-card">
              <h4>watch</h4>
              <p>Monitor directory for new backups</p>
              <code>backup-guardian watch [directory]</code>
            </div>

            <div className="command-card">
              <h4>config</h4>
              <p>Configure CLI settings and API keys</p>
              <code>backup-guardian config [options]</code>
            </div>

            <div className="command-card">
              <h4>status</h4>
              <p>Check validation job status</p>
              <code>backup-guardian status [job-id]</code>
            </div>

            <div className="command-card">
              <h4>report</h4>
              <p>Download validation reports</p>
              <code>backup-guardian report [job-id]</code>
            </div>

            <div className="command-card">
              <h4>help</h4>
              <p>Show help and available options</p>
              <code>backup-guardian --help</code>
            </div>
          </div>
        </section>

        <section className="options-section">
          <h2>Command Options</h2>
          
          <div className="options-table">
            <table>
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Description</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>--format</code></td>
                  <td>Output format (text, json, pdf)</td>
                  <td><code>--format json</code></td>
                </tr>
                <tr>
                  <td><code>--output</code></td>
                  <td>Output file path</td>
                  <td><code>--output report.json</code></td>
                </tr>
                <tr>
                  <td><code>--schedule</code></td>
                  <td>Watch schedule (hourly, daily, weekly)</td>
                  <td><code>--schedule daily</code></td>
                </tr>
                <tr>
                  <td><code>--timeout</code></td>
                  <td>Validation timeout in minutes</td>
                  <td><code>--timeout 30</code></td>
                </tr>
                <tr>
                  <td><code>--api-key</code></td>
                  <td>API authentication key</td>
                  <td><code>--api-key your-key</code></td>
                </tr>
                <tr>
                  <td><code>--verbose</code></td>
                  <td>Detailed output</td>
                  <td><code>--verbose</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="cli-cta">
          <h2>Start Using the CLI</h2>
          <p>Integrate backup validation into your workflow today</p>
          <div className="cta-buttons">
            <a href="#installation-section" className="cta-button primary">Install Now</a>
            <Link to="/faq" className="cta-button secondary">View FAQ</Link>
            <Link to="/docs" className="cta-button secondary">Full Documentation</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CLI;
