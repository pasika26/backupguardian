# BackupGuardian Documentation

## Documentation Overview

This directory contains comprehensive documentation for BackupGuardian, covering architecture, development, testing, and database abstraction layers.

## Documents

### 📋 [ARCHITECTURE.md](./ARCHITECTURE.md)
Complete system architecture documentation including:
- System overview and core components
- Database abstraction layer design
- Testing framework integration
- Data flow architecture
- Security and performance considerations

### 🧪 [TESTING_GUIDE.md](./TESTING_GUIDE.md)
Comprehensive testing documentation covering:
- Jest testing framework setup
- Unit and integration test strategies
- Coverage reporting and thresholds
- Database abstraction testing
- Performance and debugging guidelines

### 🗄️ [DATABASE_ABSTRACTION.md](./DATABASE_ABSTRACTION.md)
Detailed guide to the database abstraction layer:
- Factory pattern implementation
- Auto-detection algorithms
- PostgreSQL and MySQL implementations
- Configuration management
- Adding new database types

### 📊 [DATAFLOW_DIAGRAMS.md](./DATAFLOW_DIAGRAMS.md)
Visual representations of system processes:
- System overview flow diagrams
- Backup validation sequence diagrams
- Database auto-detection flowcharts
- Container lifecycle management
- Error handling flows

### 👨‍💻 [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
Complete developer onboarding and contribution guide:
- Quick setup instructions
- Project structure overview
- Development workflow
- Adding new features and database types
- Testing best practices

## Quick Navigation

### For New Developers
1. Start with [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for setup
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system understanding
3. Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing procedures

### For Database Integration
1. Read [DATABASE_ABSTRACTION.md](./DATABASE_ABSTRACTION.md) for concepts
2. View [DATAFLOW_DIAGRAMS.md](./DATAFLOW_DIAGRAMS.md) for visual understanding
3. Follow examples in [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for implementation

### For Architecture Understanding
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design
2. Study [DATAFLOW_DIAGRAMS.md](./DATAFLOW_DIAGRAMS.md) for process flows
3. Examine [DATABASE_ABSTRACTION.md](./DATABASE_ABSTRACTION.md) for abstraction details

## Key Concepts

### Database Abstraction Layer
BackupGuardian implements a sophisticated database abstraction layer using the Factory Pattern to support multiple database types:

- **PostgreSQL**: Fully implemented with container management
- **MySQL**: Structure complete, implementation ready
- **Future Databases**: Extensible architecture for additional types

### Testing Framework
Comprehensive Jest-based testing with:

- **Unit Tests**: Fast, isolated component testing
- **Integration Tests**: Real Docker container and database testing
- **Coverage Reports**: HTML coverage reports with threshold enforcement

### Auto-Detection Engine
Intelligent backup file analysis:

- **Filename Analysis**: Database type detection from file names
- **Content Analysis**: Syntax analysis for database-specific indicators
- **Scoring System**: Weighted scoring for accurate type detection

## Configuration Examples

### Environment Setup
```bash
# PostgreSQL Configuration
POSTGRES_TEST_IMAGE=postgres:15-alpine
POSTGRES_TEST_BASE_PORT=5433

# MySQL Configuration
MYSQL_TEST_IMAGE=mysql:8.0
MYSQL_TEST_BASE_PORT=3307

# Testing Configuration
NODE_ENV=development
MAX_CONCURRENT_TESTS=5
```

### Database Factory Usage
```javascript
const { DatabaseFactory } = require('./src/database');

// Auto-detection from file
const factory = new DatabaseFactory();
const database = factory.createDatabaseFromFile('backup.sql');

// Explicit type with configuration
const pgDatabase = factory.createDatabase('postgresql', {
    basePort: 5500,
    password: 'custom-password'
});
```

## Testing Commands

### Basic Testing
```bash
npm test                    # All tests
npm run test:coverage      # Coverage report
npm run test:watch         # Watch mode
```

### Specific Test Categories
```bash
npm run test:docker        # Docker integration
npm run test:restore       # Restore automation
npm run test:validator     # Backup validation
npm run test:database      # Database abstraction
```

### Integration Testing
```bash
node test-database-abstraction.js
node test-backup-validation-integration.js
```

## Development Workflow

### Adding New Database Types
1. Create implementation class extending `BaseDatabase`
2. Register in `DatabaseFactory`
3. Add configuration template
4. Implement detection rules
5. Write comprehensive tests
6. Update documentation

### Testing Changes
1. Write tests first (TDD approach)
2. Run unit tests: `npm run test:unit`
3. Run integration tests: `npm run test:integration`
4. Check coverage: `npm run test:coverage`
5. Test with different database configurations

### Contributing
1. Fork repository and create feature branch
2. Follow testing and documentation guidelines
3. Ensure all tests pass and coverage is maintained
4. Submit pull request with clear description

## Architecture Highlights

### Multi-Database Support
- Factory pattern for database creation
- Abstract base class for consistent interface
- Configuration management for different database types
- Auto-detection engine for intelligent type selection

### Testing Infrastructure
- Jest framework with comprehensive coverage
- Docker integration for real-world testing
- Mock services for isolated unit testing
- Performance and load testing capabilities

### Error Handling
- Graceful container cleanup on failures
- Detailed error logging and reporting
- Retry mechanisms for transient failures
- User-friendly error messages

### Security
- Isolated container environments
- Random port allocation to prevent conflicts
- Temporary file cleanup after validation
- No persistent storage of sensitive data

This documentation provides a complete reference for understanding, developing, and contributing to BackupGuardian's backup validation system.
