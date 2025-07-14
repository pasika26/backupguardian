import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './FAQ.css';

function FAQ() {
  useEffect(() => {
    // Update page title for SEO
    document.title = 'FAQ - Backup Guardian | Database Backup Questions & Answers';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Frequently asked questions about Backup Guardian database backup monitoring, PostgreSQL validation, data recovery, and backup best practices.');
    }
  }, []);

  return (
    <div className="faq-page">
      <div className="container">
        <header className="faq-header">
          <h1>Frequently Asked Questions</h1>
          <p>Everything you need to know about Backup Guardian database backup monitoring</p>
        </header>

        <section className="faq-content">
          <div className="faq-section">
            <h2>How Backup Guardian Prevents Data Loss</h2>
            
            <div className="faq-item">
              <h3>How often does Backup Guardian validate my backups?</h3>
              <p>Backup Guardian validates your database backups in real-time upon upload. You can also schedule automated validations to run daily, weekly, or monthly to ensure your backups remain healthy and restorable.</p>
            </div>

            <div className="faq-item">
              <h3>How to restore data from validated backups?</h3>
              <p>Backup Guardian validates that your backup files are complete and restorable. When you need to restore, you can use the validated backup with confidence knowing it passed our integrity checks. We provide detailed reports showing exactly what was validated.</p>
            </div>

            <div className="faq-item">
              <h3>What happens if my backup validation fails?</h3>
              <p>If a backup fails validation, Backup Guardian immediately sends alerts via email and dashboard notifications. The detailed report shows exactly what failed - corrupt data, missing tables, or format issues - so you can fix the backup process quickly.</p>
            </div>

            <div className="faq-item">
              <h3>How does Backup Guardian detect backup corruption?</h3>
              <p>Our validation engine performs comprehensive checks: file integrity verification, PostgreSQL schema validation, data completeness analysis, and test restore operations in isolated containers to ensure your backups are truly restorable.</p>
            </div>
          </div>

          <div className="faq-section">
            <h2>Backup Guardian Features & Capabilities</h2>
            
            <div className="faq-item">
              <h3>Does Backup Guardian support incremental backups?</h3>
              <p>Yes, Backup Guardian validates both full and incremental PostgreSQL backups. Our system understands pg_dump, pg_basebackup, and WAL archiving formats, ensuring all your backup types are properly validated.</p>
            </div>

            <div className="faq-item">
              <h3>What backup retention policies does Backup Guardian recommend?</h3>
              <p>We recommend the 3-2-1 backup strategy: 3 copies of your data, 2 different storage types, 1 offsite. Backup Guardian helps validate backups across all these locations to ensure your retention policy actually protects your data.</p>
            </div>

            <div className="faq-item">
              <h3>How does failure alerting work?</h3>
              <p>Backup Guardian monitors your backup validation schedule and sends immediate alerts when validations fail, are delayed, or detect issues. Alerts include detailed failure reasons and recommended actions to resolve problems quickly.</p>
            </div>

            <div className="faq-item">
              <h3>Can I integrate Backup Guardian with my CI/CD pipeline?</h3>
              <p>Absolutely! Use our CLI tool or REST API to validate backups automatically in your deployment pipeline. This ensures every application deployment includes verified backup validation.</p>
            </div>
          </div>

          <div className="faq-section">
            <h2>Security & Data Protection</h2>
            
            <div className="faq-item">
              <h3>Is my database data secure during validation?</h3>
              <p>Yes. Backup Guardian validates your backup files in isolated Docker containers that are destroyed after validation. We never store your actual database data - only validation results and metadata.</p>
            </div>

            <div className="faq-item">
              <h3>Where are backup files stored during validation?</h3>
              <p>Backup files are temporarily stored in encrypted, isolated storage during validation (typically 5-30 minutes) then automatically deleted. We never retain your backup data after validation completes.</p>
            </div>

            <div className="faq-item">
              <h3>What database sizes can Backup Guardian handle?</h3>
              <p>Backup Guardian can validate PostgreSQL backups from small development databases (MB) to large production systems (TB+). Large backups are processed in streaming mode to ensure efficient validation without memory constraints.</p>
            </div>
          </div>

          <div className="faq-section">
            <h2>Getting Started</h2>
            
            <div className="faq-item">
              <h3>How do I upload my first backup for validation?</h3>
              <p>Simply drag and drop your PostgreSQL backup file (.sql, .tar, .custom formats) onto our upload interface. Backup Guardian auto-detects the format and begins validation immediately with real-time progress updates.</p>
            </div>

            <div className="faq-item">
              <h3>What PostgreSQL versions are supported?</h3>
              <p>Backup Guardian supports PostgreSQL versions 9.6 through 16+, including all major backup formats: pg_dump (SQL), pg_dump (custom), pg_dump (tar), and pg_basebackup archives.</p>
            </div>

            <div className="faq-item">
              <h3>Do I need to install anything to use Backup Guardian?</h3>
              <p>No installation required for the web interface! For automated validation, you can optionally install our lightweight CLI tool via npm: <code>npm install -g backup-guardian</code></p>
            </div>
          </div>
        </section>

        <section className="faq-cta">
          <h2>Ready to Secure Your Database Backups?</h2>
          <p>Start validating your PostgreSQL backups with confidence</p>
          <Link to="/login" className="cta-button">Get Started Free</Link>
        </section>
      </div>
    </div>
  );
}

export default FAQ;
