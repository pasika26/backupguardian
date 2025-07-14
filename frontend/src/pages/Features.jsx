import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Features.css';

function Features() {
  useEffect(() => {
    // Update page title for SEO
    document.title = 'Backup Guardian Features | Database Backup Monitoring & Validation';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Discover all Backup Guardian features: real-time monitoring, PostgreSQL validation, automated alerts, health checks, and comprehensive backup testing.');
    }
  }, []);

  return (
    <div className="features-page">
      <div className="container">
        <header className="features-header">
          <h1>Backup Guardian Features</h1>
          <p>Comprehensive database backup monitoring and validation tools</p>
        </header>

        <section className="feature-grid">
          <div className="feature-card">
            <h2>Real-Time Monitoring & Alerts</h2>
            <p>Get instant notifications when backups fail or succeed. Monitor backup status, retention policies, and system health 24/7.</p>
            <ul>
              <li>Email and SMS alerts</li>
              <li>Custom notification rules</li>
              <li>Dashboard monitoring</li>
              <li>Backup status tracking</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>PostgreSQL Backup Validation</h2>
            <p>Validate your PostgreSQL backup files for integrity, format compliance, and data completeness before you need them.</p>
            <ul>
              <li>Automated backup testing</li>
              <li>Format validation</li>
              <li>Data integrity checks</li>
              <li>Schema verification</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>Health Checks for Peace of Mind</h2>
            <p>Comprehensive backup health assessments with detailed reports and actionable recommendations.</p>
            <ul>
              <li>Backup readiness scores</li>
              <li>Health trend analysis</li>
              <li>Performance metrics</li>
              <li>Fix suggestions</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>Automated Monitoring</h2>
            <p>Set up once and let Backup Guardian continuously monitor your backups without manual intervention.</p>
            <ul>
              <li>Scheduled validation</li>
              <li>CI/CD integration</li>
              <li>API automation</li>
              <li>Workflow triggers</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>Customizable Alerts</h2>
            <p>Configure alerts that matter to your team with flexible notification rules and escalation policies.</p>
            <ul>
              <li>Multi-channel alerts</li>
              <li>Alert escalation</li>
              <li>Team notifications</li>
              <li>Custom thresholds</li>
            </ul>
          </div>

          <div className="feature-card">
            <h2>Simple Dashboard View</h2>
            <p>Clean, intuitive interface that gives you all the information you need at a glance.</p>
            <ul>
              <li>Visual status indicators</li>
              <li>Historical trends</li>
              <li>Quick actions</li>
              <li>Report downloads</li>
            </ul>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Secure Your Backups?</h2>
          <p>Start monitoring your database backups with confidence</p>
          <Link to="/" className="cta-button">Get Started Free</Link>
        </section>
      </div>
    </div>
  );
}

export default Features;
