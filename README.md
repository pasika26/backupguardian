# 🛡️ BackupGuardian

**Validate database backup files before migration to prevent costly failures**

BackupGuardian is a comprehensive tool for testing database backup files by actually restoring them in isolated Docker containers. Get confidence in your migrations before they matter.

## ✨ Features

- **🐳 Real Validation** - Actually restores backups in Docker containers
- **🔍 Multi-Database Support** - PostgreSQL, MySQL (MongoDB coming soon)
- **📊 Detailed Reports** - Schema analysis, data integrity checks, migration scores
- **⚡ Multiple Interfaces** - Web app, CLI tool, API
- **🚀 CI/CD Ready** - Integrate into your deployment pipeline
- **📈 Team Collaboration** - Share validation history and results

## 🚀 Quick Start

### CLI Tool (Fastest)
```bash
# Install globally
npm install -g backup-guardian-cli

# Validate a backup file
backup-guardian validate backup.sql

# With detailed checks
backup-guardian validate --schema-check --data-check backup.sql
```

### Web Application
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend  
npm install
npm run dev
```

Visit http://localhost:5173 for the web interface.

## 📁 Project Structure

```
backup-guardian/
├── backend/           # Node.js + Express API
├── frontend/          # React + Vite web app
├── cli/              # Command-line tool
├── test-backups/     # Sample backup files for testing
└── docs/             # Documentation
```

## 🧪 What Gets Validated

### ✅ Restore Success
- File format validation (.sql, .dump, .backup)
- Database engine compatibility 
- Syntax error detection
- Restore command execution

### ✅ Schema Analysis
- Table structure validation
- Index and constraint verification
- Foreign key relationship checks
- Schema comparison (before/after)

### ✅ Data Integrity
- Row count verification
- Data sampling and validation
- Large table identification
- Empty table detection

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+
- Docker (for validation testing)
- PostgreSQL/MySQL (for app database)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database settings
npm run db:migrate
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### CLI Setup
```bash
cd cli
npm install
npm link  # For local development
```

## 🔧 Configuration

### Environment Variables
```bash
# Backend (.env)
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/backup_guardian
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development

# Docker Configuration
POSTGRES_TEST_BASE_PORT=5500
MYSQL_TEST_BASE_PORT=3400
```

## 📖 API Documentation

### Authentication
```bash
# Register user
POST /api/users/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}

# Login
POST /api/users/login
{
  "email": "user@example.com", 
  "password": "securepassword"
}
```

### Backup Validation
```bash
# Upload and validate backup
POST /api/backups/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Get validation results
GET /api/test-runs/:id
Authorization: Bearer <token>
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # With coverage

# Frontend tests
cd frontend
npm test

# CLI tests
cd cli
npm test
```

## 🐳 Docker Usage

### Manual Validation
```bash
# The system automatically manages Docker containers
# Containers are created, used for validation, then cleaned up
# No manual Docker commands needed!
```

### Container Management
- Automatic PostgreSQL/MySQL container creation
- Isolated testing environments
- Automatic cleanup after validation
- Port management for concurrent tests

## 📊 Example Results

```json
{
  "success": true,
  "migrationScore": 85,
  "fileType": ".sql",
  "duration": 3500,
  "restore": { "success": true },
  "schema": { 
    "success": true,
    "tables": 15,
    "indexes": 23
  },
  "data": {
    "success": true,
    "totalRows": 12847,
    "largeTables": ["analytics", "logs"]
  },
  "recommendations": [
    "Consider adding indexes on foreign key columns",
    "Review large table partitioning strategy"
  ]
}
```

## 🚀 Deployment

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for complete production deployment guide.

### Quick Deploy
```bash
# Backend (using PM2)
cd backend
npm run build
pm2 start ecosystem.config.js

# Frontend (static hosting)
cd frontend
npm run build
# Deploy dist/ folder to your hosting provider
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
```bash
# Run all services for development
npm run dev:all   # Starts backend, frontend, and CLI in watch mode
```

## 📋 Roadmap

- [ ] MongoDB backup support
- [ ] Scheduled validation jobs
- [ ] Slack/Discord integrations
- [ ] Advanced reporting dashboard
- [ ] Enterprise SSO support
- [ ] Kubernetes deployment manifests

## 📞 Support

- 📖 [Documentation](docs/)
- 🐛 [Issues](https://github.com/pasika26/backupguardian/issues)
- 💬 [Discussions](https://github.com/pasika26/backupguardian/discussions)
- 📧 Email: hello@backupguardian.org

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Why BackupGuardian?

> "We caught a critical schema issue in our backup before our production migration. BackupGuardian saved us from hours of downtime and data recovery." - DevOps Engineer

**Built by developers, for developers who value reliable migrations.**

---

**⭐ Star this repo if BackupGuardian helps you catch backup issues before they become disasters!**
