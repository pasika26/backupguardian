import './LegalPage.css';

function TermsOfUse({ onBackToHome }) {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="back-button" onClick={onBackToHome}>
          ← Back to Home
        </button>
        <h1>🛡️ Backup Guardian</h1>
      </div>
      
      <div className="legal-content">
        <h1>Terms of Use – Backup Guardian</h1>
        <p className="last-updated">Last updated: January 7, 2025</p>
        
        <p>
          These Terms of Use ("Terms") govern your access to and use of the Backup Guardian service ("Service"). By using the Service, you agree to these Terms.
        </p>

        <div className="divider"></div>

        <section>
          <h2>1. Description of Service</h2>
          <p>
            Backup Guardian is an open source tool to validate database backup files and generate readiness reports. The Service is provided under the MIT License.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>2. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Upload malicious or unauthorized content</li>
            <li>Use the Service for any illegal activities</li>
            <li>Attempt to reverse-engineer, interfere with, or disrupt the Service</li>
          </ul>
          <p>We reserve the right to suspend access if these terms are violated.</p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>3. File Uploads</h2>
          <p>
            You retain full ownership of any files you upload.<br />
            We do <strong>not</strong> store, modify, or share these files.<br />
            Uploaded files are <strong>automatically deleted</strong> immediately after validation.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>4. Disclaimer of Warranty</h2>
          <p>
            This is open source software. The Service is provided <strong>"as is"</strong> without warranties of any kind — including reliability, completeness, accuracy, or fitness for a particular purpose.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>5. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Backup Guardian is <strong>not liable for any damages</strong>, including but not limited to:</p>
          <ul>
            <li>Loss of data</li>
            <li>Failed restores</li>
            <li>Business interruption</li>
            <li>Financial losses or indirect damages</li>
          </ul>
          <p><strong>Always validate backups independently and maintain secondary recovery plans.</strong></p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>6. Changes to the Terms</h2>
          <p>
            We may update these Terms at any time. Your continued use of the Service after changes are published constitutes your acceptance of the updated Terms.
          </p>
        </section>

        <div className="divider"></div>

        <section>
          <h2>7. Contact</h2>
          <p>Questions or feedback? Reach us at <a href="mailto:hello@backupguardian.org">hello@backupguardian.org</a></p>
        </section>
      </div>
    </div>
  );
}

export default TermsOfUse;
