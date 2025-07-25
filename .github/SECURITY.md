# Security Policy

## 🛡️ Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Supported       |
| < 1.0   | ❌ Not Supported   |

## 🚨 Reporting a Vulnerability

The BackupGuardian team takes security seriously. If you discover a security vulnerability, please follow these steps:

### 📧 Private Disclosure
**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email us at: **security@backupguardian.org**

### 📋 What to Include
Please include the following information in your report:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### 🔄 Response Timeline
- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** 30-90 days (depending on complexity)

### 🏆 Recognition
We appreciate responsible disclosure and will:
- Credit you in our security advisory (if desired)
- Keep you updated on the fix progress
- Notify you when the fix is released

## 🔒 Security Measures

BackupGuardian implements several security measures:

### 🔐 Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Session management

### 🛡️ Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- File upload restrictions

### 🐳 Container Security
- Isolated Docker containers for testing
- Automatic container cleanup
- Network isolation
- Resource limits

### 🌐 Network Security
- HTTPS enforcement
- CORS configuration
- Rate limiting
- Security headers

## 🔧 Security Best Practices

When using BackupGuardian:

### 🔑 For Users
- Use strong, unique passwords
- Keep your account credentials secure
- Regularly review your test history
- Report suspicious activity

### 👨‍💻 For Developers
- Follow secure coding practices
- Validate all inputs
- Use environment variables for secrets
- Keep dependencies updated
- Run security tests

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

## 🚫 Out of Scope

The following issues are considered out of scope:
- Vulnerabilities in third-party dependencies (please report to the respective projects)
- Issues requiring physical access to systems
- Social engineering attacks
- Denial of service attacks

## 📞 Contact

For security-related questions or concerns:
- **Security Email:** security@backupguardian.org
- **General Contact:** hello@backupguardian.org
- **GitHub Issues:** For non-security related issues only

---

**Last Updated:** January 25, 2025
