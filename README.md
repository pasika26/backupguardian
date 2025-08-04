# 🛡️ BackupGuardian
Validate database backup files before migration to prevent costly failures

BackupGuardian is a comprehensive tool for validating database backup files through deep structural analysis and integrity checking. Get confidence in your migrations before they matter.

## 🌐 Live Demo
- **Web App**: https://www.backupguardian.org
- **GitHub**: https://github.com/pasika26/backupguardian
- **CLI**: `npm install -g backup-guardian`

## ✨ Features
🔍 **Smart Validation** - Deep structural analysis and integrity checking
📊 **Multi-Database Support** - PostgreSQL, MySQL, SQLite
📋 **Detailed Reports** - Schema analysis, data integrity checks, migration scores
⚡ **Multiple Interfaces** - Web app, CLI tool, API
🚀 **CI/CD Ready** - Integrate into your deployment pipeline
📈 **Team Collaboration** - Share validation history and results
🌐 **Self-Hosted** - Deploy on your own infrastructure
⭐ **Open Source** - No vendor lock-in

## 🚀 Quick Start

### CLI Tool (Fastest)
```bash
# Install globally
npm install -g backup-guardian

# Validate a backup file
backup-guardian validate backup.sql

# Get detailed help
backup-guardian --help
```

### Web Application
Try the live demo at **https://www.backupguardian.org** or run locally:

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

### ✅ File & Structure Validation
- File format validation (.sql, .dump, .backup)
- Database engine compatibility
- SQL syntax error detection
- Encoding validation

### ✅ Schema Analysis
- Table structure validation
- Index and constraint verification
- Foreign key relationship checks
- Transaction integrity analysis

### ✅ Data Integrity
- Row count verification
- Data sampling and validation
- Large table identification
- Empty table detection

## 🌐 Production Deployment
- **Web App**: https://www.backupguardian.org
- **Backend API**: https://backupguardian-production.up.railway.app
- **CLI Package**: `npm install -g backup-guardian`

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+
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
```env
# Backend (.env)
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/backup_guardian
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
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

See [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) for complete production deployment guide.

### Quick Deploy
```bash
# Backend (Railway)
git push origin main  # Auto-deploys to Railway

# Frontend (Vercel)
cd frontend
vercel --prod
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

- 📖 [Documentation](https://www.backupguardian.org)
- 🐛 [Issues](https://github.com/pasika26/backupguardian/issues)
- 💬 [Discussions](https://github.com/pasika26/backupguardian/discussions)
- 📧 Email: hello@backupguardian.org

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Why BackupGuardian?

> "We caught a critical schema issue in our backup before our production migration. BackupGuardian saved us from hours of downtime and data recovery." - DevOps Engineer

Built by developers, for developers who value reliable migrations.

⭐ **Star this repo** if BackupGuardian helps you catch backup issues before they become disasters!
