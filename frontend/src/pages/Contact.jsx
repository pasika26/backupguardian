import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Contact.css';

function Contact() {
  useEffect(() => {
    // Update page title for SEO
    document.title = 'Contact Us | Backup Guardian - Get Support & Help';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Contact Backup Guardian support team. Get help with PostgreSQL backup validation, report issues, or request features.');
    }
  }, []);

  return (
    <div className="contact-page">
      <div className="container">
        <header className="contact-header">
          <h1>Contact Backup Guardian</h1>
          <p>Get support, report issues, or share feedback with our team</p>
        </header>

        <div className="contact-grid">
          <section className="contact-methods">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h3>Email Support</h3>
              <p>Get help with technical issues or general questions</p>
              <a href="mailto:support@backupguardian.org" className="contact-link">
                support@backupguardian.org
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">🐛</div>
              <h3>Bug Reports</h3>
              <p>Found a bug? Help us improve by reporting it</p>
              <a href="https://github.com/pasika26/backupguardian/issues" target="_blank" rel="noopener noreferrer" className="contact-link">
                GitHub Issues
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">💡</div>
              <h3>Feature Requests</h3>
              <p>Suggest new features and improvements</p>
              <a href="https://github.com/pasika26/backupguardian/discussions" target="_blank" rel="noopener noreferrer" className="contact-link">
                GitHub Discussions
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">💬</div>
              <h3>Community Chat</h3>
              <p>Join our community for real-time help and discussions</p>
              <a href="https://discord.gg/backupguardian" className="contact-link">
                Discord Server
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">📱</div>
              <h3>Social Media</h3>
              <p>Follow us for updates and announcements</p>
              <div className="social-links">
                <a href="https://twitter.com/backupguardian" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://linkedin.com/company/backupguardian" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-icon">📞</div>
              <h3>Enterprise Support</h3>
              <p>Dedicated support for enterprise customers</p>
              <a href="mailto:enterprise@backupguardian.org" className="contact-link">
                enterprise@backupguardian.org
              </a>
            </div>
          </section>

          <section className="contact-form-section">
            <div className="form-container">
              <h2>Send us a Message</h2>
              <form className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select id="subject" name="subject" required>
                    <option value="">Select a topic</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="bug-report">Bug Report</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="enterprise">Enterprise Inquiry</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows="6"
                    placeholder="Please describe your question or issue in detail..."
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="updates" />
                    <span className="checkmark"></span>
                    Subscribe to product updates and announcements
                  </label>
                </div>

                <button type="submit" className="submit-btn">
                  Send Message
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className="faq-preview">
          <h2>Common Questions</h2>
          <p>Check our FAQ for quick answers to common questions</p>
          
          <div className="quick-faqs">
            <div className="quick-faq">
              <h4>How do I get started?</h4>
              <p>Simply create an account and upload your first PostgreSQL backup for validation.</p>
            </div>
            
            <div className="quick-faq">
              <h4>Is my data secure?</h4>
              <p>Yes, all backups are validated in isolated containers and automatically deleted after validation.</p>
            </div>
            
            <div className="quick-faq">
              <h4>What file formats are supported?</h4>
              <p>We support all PostgreSQL backup formats: SQL dumps, custom format, tar format, and base backups.</p>
            </div>
          </div>

          <Link to="/faq" className="faq-link">
            View All FAQ →
          </Link>
        </section>

        <section className="response-times">
          <h2>Response Times</h2>
          <div className="response-grid">
            <div className="response-item">
              <h4>General Support</h4>
              <p>24-48 hours</p>
            </div>
            <div className="response-item">
              <h4>Bug Reports</h4>
              <p>12-24 hours</p>
            </div>
            <div className="response-item">
              <h4>Enterprise Support</h4>
              <p>2-4 hours</p>
            </div>
            <div className="response-item">
              <h4>Critical Issues</h4>
              <p>Within 2 hours</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Contact;
