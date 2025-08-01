import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="nav-brand">
            <h1>🛡️ Backup Guardian</h1>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="login-btn">
              Login / Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Backup Guardian: Secure Your Database Backups
          </h1>
          <p className="hero-subtitle">
            Validate your PostgreSQL backups — before it's too late. Automatic. Reliable. No setup required.
          </p>
          
          {/* Benefits integrated into hero */}
          <div className="hero-benefits">
            <div className="benefit" aria-label="Checkmark icon indicating instant validation capability">✅ Instant validation</div>
            <div className="benefit" aria-label="Checkmark icon indicating no data storage policy">✅ No data storage</div>
            <div className="benefit" aria-label="Checkmark icon indicating detailed reports feature">✅ Detailed reports</div>
          </div>
          
          <Link to="/login" className="cta-button">
            Start Validation →
          </Link>
        </div>
      </section>

      {/* Real-Time Monitoring & Alerts */}
      <section className="why-section-compact">
        <div className="container">
          <h2>How Backup Guardian Prevents Data Loss</h2>
          <p className="why-description">
            Get instant notifications when backups fail or succeed. Database backups fail silently — corrupt files, mismatched versions, or partial exports can leave you exposed. 
            Backup Guardian validates your PostgreSQL backups instantly, giving you confidence that your data is safe.
          </p>
          <div className="prevention-features">
            <div className="prevention-item">
              <h3><span aria-label="Magnifying glass icon representing proactive validation">🔍</span> Proactive Backup Validation</h3>
              <p>Automatically detects corrupted or incomplete backups before disasters strike</p>
            </div>
            <div className="prevention-item">
              <h3><span aria-label="Lightning bolt icon representing real-time speed">⚡</span> Real-Time Failure Alerts</h3>
              <p>Immediate notifications when backup processes fail or produce invalid files</p>
            </div>
            <div className="prevention-item">
              <h3><span aria-label="Shield icon representing data protection">🛡️</span> Continuous Data Protection</h3>
              <p>Regular validation schedules ensure your backup strategy actually protects your data</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2>⚙️ How It Works (2 Simple Steps)</h2>
          <div className="steps-horizontal">
            <div className="step-compact">
              <div className="step-number">1</div>
              <h3>Upload & Validate</h3>
              <p>Drag and drop your PostgreSQL backup. We auto-detect format and run validation in a secure sandbox.</p>
            </div>
            <div className="step-compact">
              <div className="step-number">2</div>
              <h3>Get Report</h3>
              <p>Readiness score + fix suggestions. Download as PDF/JSON. Files automatically deleted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CLI & Web Options */}
      <section className="usage-section">
        <div className="container">
          <h2>🖥️ Use via Web or CLI</h2>
          <div className="usage-options-compact">
            <div className="usage-option-compact">
              <h3>🌐 Web Interface</h3>
              <p>Easy drag-and-drop validation with visual reports</p>
              <Link to="/login" className="cta-button">
                Try Web App →
              </Link>
            </div>
            <div className="usage-option-compact">
              <h3>⌨️ Command Line</h3>
              <p>Integrate into CI/CD pipelines and automation</p>
              <div className="cli-example-compact">
                <code>npx backup-guardian validate backup.sql</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Health Checks for Peace of Mind */}
      <section className="features-grid">
        <div className="container">
          <h2>Health Checks for Peace of Mind</h2>
          <p>Monitor backup status, retention policies, and integrity with automated health assessments.</p>
          <div className="feature-columns">
            <div className="feature-column">
              <h3>🔒 Security First</h3>
              <ul>
                <li>Files automatically deleted</li>
                <li>Isolated processing environment</li>
                <li>No data stored on servers</li>
              </ul>
            </div>
            <div className="feature-column">
              <h3>📊 Detailed Reports</h3>
              <ul>
                <li>Readiness score & fix suggestions</li>
                <li>PDF & JSON export options</li>
                <li>Human-readable validation results</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Backup Guardian? */}
      <section className="use-cases">
        <div className="container">
          <h2>Why Choose Backup Guardian?</h2>
          <div className="use-case-grid">
            <div className="use-case">
              <h3>🚀 Automated monitoring</h3>
              <p>Validate backups without dedicated DevOps resources</p>
            </div>
            <div className="use-case">
              <h3>⚡ Customizable alerts</h3>
              <p>Integrate into CI/CD pipelines and monitoring workflows</p>
            </div>
            <div className="use-case">
              <h3>🛠️ Simple dashboard view</h3>
              <p>Quick validation and monitoring for all your projects</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="open-source">
        <div className="container">
          <h2>🔓 100% Open Source</h2>
          <div className="open-source-card">
            <h3>Free Forever</h3>
            <ul>
              <li>→ MIT License</li>
              <li>→ Self-hosted deployment</li>
              <li>→ Community driven</li>
              <li>→ No vendor lock-in</li>
            </ul>
            <p className="open-source-note">
              <a href="https://github.com/pasika26/backupguardian" target="_blank" rel="noopener noreferrer">
                ⭐ Star us on GitHub
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <h2>🚀 Get Started with Backup Guardian</h2>
          <p>Open source. Self-hosted. No lock-in.<br />Validate your backups with confidence.</p>
          <Link to="/login" className="cta-button">
            Start Validation →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>🛡️ Backup Guardian</h3>
              <p>Built for developers who care about data integrity.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <Link to="/features">Features</Link>
                <Link to="/faq">FAQ</Link>
                <a href="/docs">Documentation</a>
                <a href="/cli">CLI Tool</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <Link to="/terms" className="footer-link">Terms of Service</Link>
                <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                <a href="/contact">Contact Us</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Backup Guardian. All rights reserved.</p>
            <p className="footer-security">🔒 Your data is validated securely and automatically deleted.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
