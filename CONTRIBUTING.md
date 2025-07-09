# Contributing to BackupGuardian

Thank you for your interest in contributing to BackupGuardian! This document provides guidelines and information for contributors.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Docker Desktop
- Git

### Development Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/yourusername/backup-guardian.git
cd backup-guardian

# 2. Install dependencies
npm run install:all  # Installs backend, frontend, and CLI deps

# 3. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database settings

# 4. Start development servers
npm run dev:all  # Starts backend, frontend, and watches for changes

# 5. Run tests
npm test
```

## 🛠️ Project Structure

```
backup-guardian/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite web app  
├── cli/             # Command-line tool
├── test-backups/    # Sample backup files
└── docs/           # Documentation
```

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include steps to reproduce, expected vs actual behavior
- Provide system info (OS, Node.js version, Docker version)

### ✨ Feature Requests
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case and expected behavior
- Check existing issues to avoid duplicates

### 🔧 Code Contributions

#### Good First Issues
Look for issues labeled `good first issue`:
- Documentation improvements
- Adding test cases
- CLI output formatting
- Error message improvements

#### Database Support
- MySQL enhancements
- MongoDB support (planned)
- Database-specific validation logic

#### Advanced Features
- Performance optimizations
- Enterprise features (SSO, RBAC)
- CI/CD integrations
- Cloud provider support

## 📝 Development Guidelines

### Code Style
- **Backend**: ES6+ async/await, no callbacks
- **Frontend**: Functional components with hooks
- **Database**: snake_case columns, camelCase JavaScript
- **Files**: kebab-case filenames, PascalCase React components

### Commit Messages
Follow [Conventional Commits](https://conventionalcommits.org/):
```
feat: add MySQL restore validation
fix: handle Docker container cleanup edge case
docs: update CLI installation guide
test: add schema validation test cases
```

### Pull Request Process
1. **Create a branch** from `main` with descriptive name
2. **Write tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** locally: `npm test`
5. **Create PR** with clear description of changes

### Testing
```bash
# Backend tests
cd backend && npm test
cd backend && npm run test:coverage

# Frontend tests  
cd frontend && npm test

# CLI tests
cd cli && npm test

# Integration tests
npm run test:integration
```

## 🎨 UI/UX Guidelines

### Frontend Components
- Use existing component patterns
- Follow Material-UI or similar design system
- Ensure mobile responsiveness
- Add loading states and error handling

### CLI Interface
- Clear, actionable output
- Progress indicators for long operations
- Consistent color coding (green=success, red=error)
- Helpful error messages with suggestions

## 🏗️ Architecture Guidelines

### Adding Database Support
1. Create new database class in `backend/src/database/`
2. Implement base methods: `connect()`, `restore()`, `validate()`
3. Add database-specific validation logic
4. Update factory pattern in `database-factory.js`
5. Add comprehensive tests

### API Endpoints
- Follow RESTful conventions
- Include proper error handling
- Add input validation
- Document with OpenAPI/Swagger comments

### Docker Integration
- Use official database images
- Implement proper health checks
- Handle container lifecycle gracefully
- Clean up resources on errors

## 🧪 Testing Guidelines

### Unit Tests
- Test individual functions and classes
- Mock external dependencies (Docker, database)
- Aim for 80%+ code coverage

### Integration Tests
- Test complete workflows
- Use real Docker containers when needed
- Test error scenarios and edge cases

### End-to-End Tests
- Test full user journeys
- Include CLI, web app, and API flows
- Test with real backup files

## 📚 Documentation

### Code Documentation
- Document complex algorithms
- Explain business logic decisions
- Include JSDoc comments for public APIs

### User Documentation
- Update README for new features
- Add examples and use cases
- Keep installation guides current

## 🚀 Release Process

### Versioning
We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Steps (Maintainers)
1. Update version in all `package.json` files
2. Update CHANGELOG.md
3. Create release tag
4. Publish CLI to npm
5. Update documentation

## 💡 Getting Help

### Community Channels
- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat (link in README)

### Maintainer Contact
- **Email**: contributors@backup-guardian.com
- **GitHub**: @yourusername

## 🏆 Recognition

### Contributors
- All contributors are listed in `CONTRIBUTORS.md`
- Significant contributions mentioned in release notes
- Swag program for major contributors

### Becoming a Maintainer
- Consistent quality contributions
- Help with issue triage and PR reviews
- Demonstrate commitment to project values

## 📄 License

By contributing to BackupGuardian, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## 🙏 Thank You

Every contribution matters, whether it's code, documentation, bug reports, or feature suggestions. Thank you for helping make BackupGuardian better!

---

**Questions?** Open a [GitHub Discussion](https://github.com/yourusername/backup-guardian/discussions) or check our [FAQ](docs/FAQ.md).
