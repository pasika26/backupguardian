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
                <code>backup-guardian validate backup.sql --json</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('backup-guardian validate backup.sql --json')}>
                  📋 Copy
                </button>
              </div>
              <p>Validates backup and outputs detailed results in JSON format for automation.</p>
            </div>

            <div className="command-group">
              <h3>Detailed Schema Check</h3>
              <div className="code-block">
                <code>backup-guardian validate backup.sql --schema-check --data-check</code>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('backup-guardian validate backup.sql --schema-check --data-check')}>
                  📋 Copy
                </button>
              </div>
              <p>Validates backup with detailed schema analysis and data integrity checks.</p>
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
          backup-guardian validate backup.sql --json
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
    - backup-guardian validate backup.sql --json
  artifacts:
    when: always
    paths:
      - backup-validation.json`}</code>
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
              <p>Validate a database backup file</p>
              <code>backup-guardian validate [file]</code>
            </div>

            <div className="command-card">
              <h4>version</h4>
              <p>Display version information</p>
              <code>backup-guardian version</code>
            </div>

            <div className="command-card">
              <h4>demo</h4>
              <p>Run a demo validation (no Docker required)</p>
              <code>backup-guardian demo [file]</code>
            </div>

            <div className="command-card">
              <h4>config</h4>
              <p>Configure CLI settings</p>
              <code>backup-guardian config [options]</code>
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
                  <td><code>--json</code></td>
                  <td>Output results in JSON format</td>
                  <td><code>--json</code></td>
                </tr>
                <tr>
                  <td><code>--type</code></td>
                  <td>Database type (postgresql, mysql)</td>
                  <td><code>--type postgresql</code></td>
                </tr>
                <tr>
                  <td><code>--schema-check</code></td>
                  <td>Enable detailed schema validation</td>
                  <td><code>--schema-check</code></td>
                </tr>
                <tr>
                  <td><code>--data-check</code></td>
                  <td>Enable data integrity checks</td>
                  <td><code>--data-check</code></td>
                </tr>
                <tr>
                  <td><code>--verbose</code></td>
                  <td>Enable verbose output</td>
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
