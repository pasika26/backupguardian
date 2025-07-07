# Terms of Service for Backup Guardian

**Effective Date:** January 7, 2025  
**Last Updated:** January 7, 2025

## Acceptance of Terms

By accessing or using Backup Guardian ("Service") at backupguardian.org, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.

## Service Description

Backup Guardian is a database backup validation service that:
- Tests PostgreSQL backup files for integrity and restorability
- Provides detailed validation reports in PDF and JSON formats
- Automatically deletes uploaded files for security and privacy
- Offers both web interface and command-line tools

## User Accounts and Responsibilities

### Account Registration
- You must provide accurate and complete information during registration
- You are responsible for maintaining the confidentiality of your account credentials
- You must notify us immediately of any unauthorized use of your account
- One person or entity per account; no account sharing

### Acceptable Use
You agree to use the Service only for:
- ✅ Validating legitimate PostgreSQL backup files
- ✅ Testing backup integrity for your own databases or those you have permission to access
- ✅ Generating validation reports for compliance or operational purposes

### Prohibited Activities
You may not:
- ❌ Upload files containing malicious code, viruses, or harmful content
- ❌ Attempt to reverse engineer, hack, or compromise the Service
- ❌ Use the Service to validate backups you don't have permission to access
- ❌ Upload files exceeding 100MB per file
- ❌ Create multiple accounts to circumvent usage limitations
- ❌ Use automated tools to overwhelm the Service (rate limiting applies)

## File Upload and Processing

### File Handling
- **Supported formats:** .sql, .dump, .backup files only
- **File size limit:** 100MB maximum per upload
- **Processing time:** Validation typically completes within 10 minutes
- **Automatic deletion:** All uploaded files are deleted within 7 days maximum

### Data Security
- Files are processed in isolated Docker containers
- No permanent storage of your backup data
- Results are retained for 90 days for historical reporting
- We do not access the content of your databases beyond validation testing

## Service Availability

### Uptime and Performance
- We strive for 99.9% uptime but do not guarantee uninterrupted service
- Scheduled maintenance will be announced in advance when possible
- Service may be temporarily unavailable due to technical issues or updates

### Usage Limitations
- Fair use policy applies; excessive usage may be rate-limited
- Free tier may have daily/monthly validation limits
- Enterprise users may have different limits as specified in their agreements

## Intellectual Property

### Your Content
- You retain ownership of all backup files and data you upload
- You grant us a temporary license to process your files solely for validation purposes
- We do not claim ownership of your database schemas or data

### Our Service
- Backup Guardian software is open source under MIT License
- Our hosted service, documentation, and branding remain our property
- You may not copy, modify, or redistribute our hosted service

## Privacy and Data Protection

Your privacy is important to us. Our data handling practices are governed by our [Privacy Policy](PRIVACY_POLICY.md), which is incorporated into these Terms by reference.

## Disclaimers and Limitations

### Service Disclaimer
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
- Accuracy or completeness of validation results
- Suitability for any particular purpose
- Uninterrupted or error-free operation
- Security of data transmission or storage

### Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
- Our total liability shall not exceed $100 or the amount you paid for the Service in the past 12 months
- We are not liable for indirect, incidental, special, or consequential damages
- We are not responsible for data loss, business interruption, or lost profits
- You use the Service at your own risk

### Backup Validation Results
- Validation results are provided for informational purposes only
- We do not guarantee that a "successful" validation means your backup will restore perfectly in all scenarios
- You should always test backups in your own environment before relying on them
- We are not responsible for failed restores or data loss from backups that passed our validation

## Termination

### By You
- You may delete your account at any time through the Service interface
- Account deletion will permanently remove your data and validation history
- Downloaded reports remain your property after account deletion

### By Us
We may suspend or terminate your account if you:
- Violate these Terms or our Privacy Policy
- Engage in fraudulent or illegal activities
- Abuse the Service or negatively impact other users
- Provide false information during registration

## Open Source and Self-Hosting

- Backup Guardian software is available under MIT License on GitHub
- These Terms apply only to our hosted service at backupguardian.org
- Self-hosted deployments are not subject to these Terms
- Commercial support for self-hosted deployments may be available separately

## Changes to Terms

We may update these Terms to reflect changes in our Service or legal requirements. We will notify users of material changes by:
- Email notification to registered users
- Prominent notice on our website
- Update to the "Last Updated" date above

Continued use of the Service after changes constitutes acceptance of the updated Terms.

## Governing Law and Disputes

- These Terms are governed by the laws of Delaware, United States
- Any disputes will be resolved through binding arbitration in Delaware
- You waive the right to participate in class-action lawsuits
- If arbitration is unavailable, disputes will be resolved in Delaware state courts

## Contact Information

**General Questions:** hello@backupguardian.org  
**Legal Issues:** hello@backupguardian.org  
**GitHub Repository:** https://github.com/pasika26/backupguardian  
**Service Website:** https://backupguardian.org

## Entire Agreement

These Terms, together with our Privacy Policy, constitute the entire agreement between you and Backup Guardian regarding the Service and supersede all prior agreements and understandings.

---

**Thank you for using Backup Guardian!**

*We're committed to helping you validate your database backups securely and efficiently.*
