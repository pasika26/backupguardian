import { useState } from 'react';
import './LandingPage.css';

function LandingPage({ onGetStarted, onNavigate }) {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="nav-brand">
            <h1>🛡️ Backup Guardian</h1>
          </div>
          <div className="nav-actions">
            <button className="login-btn" onClick={onGetStarted}>
              Login / Sign Up
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Validate your PostgreSQL backups — before it's too late.
          </h1>
          <p className="hero-subtitle">
            Automatic. Reliable. No setup required.
          </p>
          
          {/* Benefits integrated into hero */}
          <div className="hero-benefits">
            <div className="benefit">✅ Instant validation</div>
            <div className="benefit">✅ No data storage</div>
            <div className="benefit">✅ Detailed reports</div>
          </div>
          
          <button className="cta-button" onClick={onGetStarted}>
            Start Validation →
          </button>
        </div>
      </section>

      {/* Why Section - Compact */}
      <section className="why-section-compact">
        <div className="container">
          <h2>✅ Why Backup Guardian?</h2>
          <p className="why-description">
            Database backups fail silently — corrupt files, mismatched versions, or partial exports can leave you exposed. 
            Backup Guardian validates your PostgreSQL backups instantly, giving you confidence that your data is safe.
          </p>
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
              <button className="cta-button" onClick={onGetStarted}>
                Try Web App →
              </button>
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

      {/* Features Grid */}
      <section className="features-grid">
        <div className="container">
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

      {/* Use Cases */}
      <section className="use-cases">
        <div className="container">
          <h2>💡 Perfect For</h2>
          <div className="use-case-grid">
            <div className="use-case">
              <h3>🚀 Startup Teams</h3>
              <p>Validate backups without dedicated DevOps resources</p>
            </div>
            <div className="use-case">
              <h3>⚡ SRE Teams</h3>
              <p>Integrate into CI/CD pipelines and monitoring</p>
            </div>
            <div className="use-case">
              <h3>🛠️ Solo Developers</h3>
              <p>Quick validation for personal projects</p>
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
              <a href="https://github.com/backup-guardian/backup-guardian" target="_blank" rel="noopener noreferrer">
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
          <button className="cta-button" onClick={onGetStarted}>
            Start Validation →
          </button>
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
                <a href="/docs">Documentation</a>
                <a href="/cli">CLI Tool</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <button onClick={() => onNavigate('terms')} className="footer-link">Terms of Service</button>
                <button onClick={() => onNavigate('privacy')} className="footer-link">Privacy Policy</button>
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
