# BackupGuardian Developer Guide

## Getting Started

This guide helps new developers understand BackupGuardian's architecture, set up the development environment, and contribute effectively to the project.

## Quick Setup

### Prerequisites
- Node.js 18+ 
- Docker Desktop
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd backup-guardian

# Backend setup
cd backend
npm install
cp .env.example .env    # Configure environment variables
npm run db:migrate      # Setup SQLite database for development
npm run db:seed         # Seed with test data
npm test               # Verify setup with all tests
npm run dev            # Start development server (port 3001)

# Frontend setup (separate terminal)
cd frontend
npm install
npm run dev            # Start frontend (port 5173)
```

### Verify Installation
```bash
# Test backend API
curl http://localhost:3001/api/health

# Test database abstraction
cd backend
node test-database-abstraction.js

# Run full test suite
npm run test:coverage
```

## Project Structure

```
backup-guardian/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── database/       # Database abstraction layer
│   │   │   ├── base-database.js
│   │   │   ├── postgresql-database.js
│   │   │   ├── mysql-database.js
│   │   │   ├── database-factory.js
│   │   │   └── database-config.js
│   │   ├── services/       # Business logic services
│   │   │   ├── backup-validator.js
│   │   │   ├── restore-automation.js
│   │   │   ├── queue-service.js
│   │   │   └── cleanup-service.js
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Express middleware
│   │   ├── db/            # Database schema & migrations
│   │   └── __tests__/     # Unit tests
│   ├── test-*.js          # Integration tests
│   ├── jest.config.js     # Jest configuration
│   └── package.json
├── frontend/              # React + Vite frontend
├── docs/                  # Documentation
├── test-backups/         # Sample backup files for testing
└── README.md
```

## Core Architecture Concepts

### 1. Database Abstraction Layer

The heart of BackupGuardian's multi-database support:

```javascript
// Factory pattern creates database instances
const factory = new DatabaseFactory();
const database = factory.createDatabaseFromFile('backup.sql');

// All databases implement the same interface
await database.createContainer(testId);
await database.restoreBackup(filePath, connectionInfo, containerName);
await database.validateData(connectionInfo, containerName);
await database.cleanup(containerName);
```

**Key Files:**
- `src/database/base-database.js` - Abstract interface
- `src/database/database-factory.js` - Creation logic
- `src/database/postgresql-database.js` - PostgreSQL implementation
- `src/database/mysql-database.js` - MySQL implementation

### 2. Testing Framework

Jest-based testing with multiple test types:

```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Coverage report
```

**Test Categories:**
- **Unit Tests** (`*.test.js`): Fast, isolated component tests
- **Integration Tests** (`test-*.js`): Real Docker containers and databases
- **Coverage Tests**: HTML reports in `coverage/` directory

### 3. Validation Engine

The core business logic for backup validation:

```javascript
// BackupValidator orchestrates the validation process
const validator = new BackupValidator(database);
const result = await validator.validateBackup('/path/to/backup.sql');

// Result includes:
// - restore status
// - data validation
// - schema validation  
// - performance metrics
// - container cleanup
```

## Development Workflow

### 1. Adding New Features

```bash
# Create feature branch
git checkout -b feature/new-database-support

# Write tests first (TDD approach)
# Add unit tests in src/**/*.test.js
# Add integration tests as test-*.js

# Implement feature
# Update documentation
# Run tests
npm test

# Submit pull request
```

### 2. Testing Your Changes

```bash
# Test specific components
npm run test:validator     # Backup validation logic
npm run test:docker       # Docker integration
npm run test:restore      # Restore automation

# Test with different databases
POSTGRES_TEST_BASE_PORT=5500 npm test
MYSQL_TEST_BASE_PORT=3400 npm test

# Load testing
npm run test:performance   # If implemented
```

### 3. Debugging

```bash
# Debug mode with verbose logging
DEBUG=backup-guardian:* npm run dev

# Docker debugging
docker ps -a --filter "name=test-"    # List test containers
docker logs <container-name>          # View container logs
docker exec -it <container> psql -U testuser -d testdb  # Connect to database

# Test debugging
npm run test:watch         # Watch mode for development
node --inspect-brk $(npm bin)/jest --runInBand  # Debug with breakpoints
```

## Adding New Database Types

Follow this process to add support for a new database type:

### 1. Create Database Implementation

```javascript
// src/database/sqlite-database.js
const BaseDatabase = require('./base-database');

class SQLiteDatabase extends BaseDatabase {
    constructor(config = {}) {
        super(config);
        this.dbConfig = new DatabaseConfig().getConfig('sqlite', config);
    }
    
    async createContainer(testId) {
        // SQLite doesn't need containers - use local file
        const dbPath = `/tmp/test-${testId}.db`;
        return {
            containerName: `sqlite-${testId}`,
            connectionInfo: { database: dbPath }
        };
    }
    
    async restoreBackup(backupFilePath, connectionInfo, containerName) {
        // Implement SQLite restore logic
    }
    
    async validateData(connectionInfo, containerName, options = {}) {
        // Implement SQLite validation
    }
    
    getDatabaseType() {
        return 'sqlite';
    }
    
    getSupportedExtensions() {
        return ['.sql', '.db', '.sqlite'];
    }
    
    // Implement other abstract methods...
}

module.exports = SQLiteDatabase;
```

### 2. Register in Factory

```javascript
// src/database/database-factory.js
const SQLiteDatabase = require('./sqlite-database');

class DatabaseFactory {
    constructor() {
        this.databases = new Map([
            ['postgresql', PostgreSQLDatabase],
            ['mysql', MySQLDatabase],
            ['sqlite', SQLiteDatabase],      // Add new database
            ['sqlite3', SQLiteDatabase]      // Add aliases
        ]);
    }
}
```

### 3. Add Configuration

```javascript
// src/database/database-config.js
getDefaultConfig(databaseType) {
    const configs = {
        sqlite: {
            path: '/tmp',
            user: 'testuser',
            database: 'testdb.db'
        }
    };
}
```

### 4. Add Detection Rules

```javascript
// src/database/database-factory.js
detectDatabaseTypeFromContent(content) {
    const sqliteIndicators = [
        'PRAGMA',
        'sqlite_master',
        'AUTOINCREMENT',
        'sqlite3'
    ];
    
    // Add to scoring logic
}
```

### 5. Write Tests

```javascript
// src/database/sqlite-database.test.js
describe('SQLiteDatabase', () => {
    let database;
    
    beforeEach(() => {
        const factory = new DatabaseFactory();
        database = factory.createDatabase('sqlite');
    });
    
    it('should create SQLite database', async () => {
        const container = await database.createContainer('test-123');
        expect(container.connectionInfo.database).toContain('test-123');
    });
});
```

### 6. Update Documentation

- Add to `README.md` supported databases list
- Update `docs/DATABASE_ABSTRACTION.md`
- Add examples to `docs/DEVELOPER_GUIDE.md`

## Common Development Tasks

### Adding API Endpoints

```javascript
// src/routes/backups.js
router.post('/validate', async (req, res) => {
    try {
        const { filePath, databaseType } = req.body;
        
        const factory = new DatabaseFactory();
        const database = factory.createDatabase(databaseType);
        const validator = new BackupValidator(database);
        
        const result = await validator.validateBackup(filePath);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Adding Background Jobs

```javascript
// src/services/queue-service.js
const Queue = require('bull');
const validationQueue = new Queue('validation');

validationQueue.process(async (job) => {
    const { filePath, userId } = job.data;
    
    const factory = new DatabaseFactory();
    const database = factory.createDatabaseFromFile(filePath);
    const validator = new BackupValidator(database);
    
    return await validator.validateBackup(filePath);
});
```

### Adding Middleware

```javascript
// src/middleware/database-detection.js
const databaseDetection = (req, res, next) => {
    if (req.file) {
        const factory = new DatabaseFactory();
        req.detectedDatabase = factory.createDatabaseFromFile(req.file.path);
    }
    next();
};
```

## Testing Best Practices

### 1. Unit Test Structure

```javascript
const { describe, beforeEach, afterEach, it, expect, jest } = require('@jest/globals');

describe('ServiceName', () => {
    let service;
    let mockDependency;
    
    beforeEach(() => {
        mockDependency = {
            method: jest.fn()
        };
        service = new ServiceName(mockDependency);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('methodName', () => {
        it('should handle success case', async () => {
            // Arrange
            mockDependency.method.mockResolvedValue('success');
            
            // Act
            const result = await service.methodName();
            
            // Assert
            expect(result).toBe('success');
            expect(mockDependency.method).toHaveBeenCalledTimes(1);
        });
        
        it('should handle error case', async () => {
            // Test error scenarios
        });
    });
});
```

### 2. Integration Test Structure

```javascript
describe('Integration: BackupValidator', () => {
    let validator;
    let database;
    
    beforeAll(async () => {
        // Setup real database instance
        const factory = new DatabaseFactory();
        database = factory.createDatabase('postgresql');
        validator = new BackupValidator(database);
    });
    
    afterAll(async () => {
        // Cleanup any remaining containers
        await cleanupTestContainers();
    });
    
    it('should validate real backup file', async () => {
        const result = await validator.validateBackup('./test-backups/sample.sql');
        
        expect(result.success).toBe(true);
        expect(result.validation.tableCount).toBeGreaterThan(0);
    }, 60000); // Longer timeout for real operations
});
```

### 3. Mocking External Dependencies

```javascript
// Mock Docker operations
jest.mock('child_process', () => ({
    exec: jest.fn(),
    execSync: jest.fn()
}));

// Mock database connections
jest.mock('pg', () => ({
    Client: jest.fn(() => ({
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn()
    }))
}));
```

## Configuration Management

### Environment Variables

```bash
# .env file structure
NODE_ENV=development
PORT=3001
DATABASE_URL=sqlite:./backup_guardian.db

# PostgreSQL test configuration
POSTGRES_TEST_IMAGE=postgres:15-alpine
POSTGRES_TEST_USER=testuser
POSTGRES_TEST_PASSWORD=testpass123
POSTGRES_TEST_BASE_PORT=5433

# MySQL test configuration
MYSQL_TEST_IMAGE=mysql:8.0
MYSQL_TEST_USER=testuser
MYSQL_TEST_PASSWORD=testpass123
MYSQL_TEST_ROOT_PASSWORD=rootpass123
MYSQL_TEST_BASE_PORT=3307

# Docker configuration
DOCKER_TIMEOUT=30000
MAX_CONCURRENT_TESTS=5

# Logging
LOG_LEVEL=info
DEBUG=backup-guardian:*
```

### Database Configuration

```javascript
// Override default configurations
const config = {
    postgresql: {
        basePort: 5500,
        image: 'postgres:13',
        password: 'custom-password'
    },
    mysql: {
        basePort: 3400,
        image: 'mysql:8.0.33'
    }
};

const factory = new DatabaseFactory();
const database = factory.createDatabase('postgresql', config.postgresql);
```

## Performance Optimization

### Container Management

```javascript
// Efficient port allocation
class PortManager {
    constructor(basePort, maxPorts = 100) {
        this.basePort = basePort;
        this.maxPorts = maxPorts;
        this.usedPorts = new Set();
    }
    
    allocatePort() {
        for (let i = 0; i < this.maxPorts; i++) {
            const port = this.basePort + i;
            if (!this.usedPorts.has(port)) {
                this.usedPorts.add(port);
                return port;
            }
        }
        throw new Error('No available ports');
    }
    
    releasePort(port) {
        this.usedPorts.delete(port);
    }
}
```

### Parallel Processing

```javascript
// Process multiple validations concurrently
async function validateMultipleBackups(filePaths, maxConcurrency = 3) {
    const semaphore = new Semaphore(maxConcurrency);
    
    const promises = filePaths.map(async (filePath) => {
        await semaphore.acquire();
        try {
            return await validateSingleBackup(filePath);
        } finally {
            semaphore.release();
        }
    });
    
    return Promise.all(promises);
}
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check for used ports
   netstat -tuln | grep :5433
   
   # Use different base port
   POSTGRES_TEST_BASE_PORT=5500 npm test
   ```

2. **Docker Issues**
   ```bash
   # Verify Docker is running
   docker --version
   
   # Clean up test containers
   docker ps -q --filter "name=test-" | xargs -r docker rm -f
   ```

3. **Test Failures**
   ```bash
   # Run specific test file
   npm test -- --testPathPattern=backup-validator
   
   # Debug mode
   node --inspect-brk $(npm bin)/jest --runInBand
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

### Debug Tools

```bash
# Container inspection
docker inspect <container-name>
docker exec -it <container-name> bash

# Database debugging
docker exec -it <postgres-container> psql -U testuser -d testdb
docker exec -it <mysql-container> mysql -u testuser -p testdb

# Log analysis
tail -f logs/app.log
DEBUG=backup-guardian:database npm run dev
```

## Contributing Guidelines

### Code Style

- Use ES6+ features (async/await, destructuring, arrow functions)
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use meaningful variable and function names

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Update documentation
6. Submit pull request with clear description

### Code Review Checklist

- [ ] All tests pass
- [ ] Code coverage maintained/improved
- [ ] Documentation updated
- [ ] No hardcoded secrets or credentials
- [ ] Error handling implemented
- [ ] Backward compatibility maintained
- [ ] Performance impact considered

This developer guide provides everything needed to contribute effectively to BackupGuardian's continued development and enhancement.
