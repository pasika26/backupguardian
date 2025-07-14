import { Link } from 'react-router-dom';
import './LegalPage.css';

function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <Link to="/" className="back-button">
          ← Back to Home
        </Link>
        <h1>🛡️ Backup Guardian</h1>
      </div>
      
      <div className="legal-content">
        <h1>Privacy Policy – Backup Guardian</h1>
        <p className="last-updated">Last updated: January 7, 2025</p>
        
        <p>
          Backup Guardian ("we", "our", or "us") respects your privacy. This Privacy Policy describes how we collect, use, and protect your information when you use our website and backup validation tool.
        </p>

        <div className="divider"></div>

        <section>
          <h2>1. What We Collect</h2>
          <p>We may collect:</p>
          <ul>
            <li><strong>Uploaded backup files</strong> — These are processed temporarily for validation and are <strong>not stored</strong> after processing</li>
            <li><strong>Basic usage data</strong> — Such as IP address, browser type, and validation attempts (for security and performance tracking)</li>
            <li><strong>Optional email</strong> — If you choose to sign up or contact us</li>
          </ul>
        </section>

        <div className="divider"></div>

        <section>
          <h2>2. How We Use Data</h2>
          <p>We use your data to:</p>
          <ul>
            <li>Validate your backup and generate a report</li>
            <li>Improve our service (e.g., bug tracking, performance metrics)</li>
            <li>Respond to inquiries (if you email us)</li>
          </ul>
          <p><strong>We do not sell or share your personal data with third parties for marketing purposes.</strong></p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>3. File Handling and Deletion</h2>
          <p>Uploaded backup files are:</p>
          <ul>
            <li>Processed temporarily in memory or secure scratch storage</li>
            <li><strong>Automatically deleted immediately</strong> after validation completes</li>
            <li><strong>Never stored, viewed, or shared</strong> by us</li>
          </ul>
        </section>

        <div className="divider"></div>

        <section>
          <h2>4. Cookies & Analytics</h2>
          <p>
            We may use cookies or analytics tools (e.g., Google Analytics) to understand website usage patterns. You can disable cookies through your browser settings at any time.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>5. Data Security</h2>
          <p>
            We implement reasonable technical and organizational measures to protect your data. However, no method of transmission or storage is 100% secure, and you use the service at your own risk.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request deletion of any data you voluntarily provided (e.g., your email address)</li>
            <li>Contact us with privacy-related questions or concerns</li>
            <li>Withdraw consent for data collection at any time</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:hello@backupguardian.org">hello@backupguardian.org</a></p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be reflected with a new "Last Updated" date at the top of this page.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
