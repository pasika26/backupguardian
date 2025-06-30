# BackupGuardian Testing Guide

## Overview

BackupGuardian uses a comprehensive testing strategy with **Jest** as the primary testing framework, covering unit tests, integration tests, and end-to-end validation workflows.

## Testing Architecture

### Test Categories

1. **Unit Tests** (`*.test.js` files in `src/`)
   - Database abstraction layer components
   - Service logic and business rules  
   - Utility functions and helpers
   - Configuration management

2. **Integration Tests** (Root-level `test-*.js` files)
   - API endpoint functionality
   - Docker container operations
   - Database restore workflows
   - Queue processing and job execution

3. **Coverage Tests**
   - Code coverage reporting with HTML output
   - Minimum coverage thresholds
   - Missing test identification

## Test Commands

### Basic Testing Commands

```bash
# Run all tests (unit + integration)
npm test

# Run tests with coverage reporting
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Specific Test Categories

```bash
# Docker integration tests
npm run test:docker

# Database restore automation
npm run test:restore  

# Backup validation engine
npm run test:validator

# Result storage functionality
npm run test:storage

# Container cleanup service
npm run test:cleanup

# API endpoints
npm run test:api

# Authentication system
npm run test:auth

# File upload functionality
npm run test:upload
```

### Database-Specific Testing

```bash
# Test PostgreSQL functionality
POSTGRES_TEST_BASE_PORT=5500 npm run test:validator

# Test with custom MySQL configuration
MYSQL_TEST_BASE_PORT=3400 npm run test:integration

# Test database abstraction layer
node test-database-abstraction.js

# Test backup validation integration
node test-backup-validation-integration.js
```

## Test Structure & Organization

### Unit Test Structure

```javascript
// Example: src/services/backup-validator.test.js
const { describe, beforeEach, afterEach, it, expect, jest } = require('@jest/globals');
const BackupValidator = require('./backup-validator');

describe('BackupValidator', () => {
    let validator;
    let mockDatabase;
    let mockLogger;
    
    beforeEach(() => {
        // Setup mocks and test instances
        mockDatabase = {
            createContainer: jest.fn(),
            restoreBackup: jest.fn(),
            validateData: jest.fn(),
            cleanup: jest.fn()
        };
        
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        
        validator = new BackupValidator(mockDatabase, mockLogger);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('validateBackup', () => {
        it('should successfully validate a PostgreSQL backup', async () => {
            // Arrange
            const testFile = '/path/to/test.sql';
            const expectedResult = { success: true, details: {} };
            
            mockDatabase.createContainer.mockResolvedValue({
                containerName: 'test-container',
                connectionInfo: { host: 'localhost', port: 5433 }
            });
            mockDatabase.restoreBackup.mockResolvedValue({ success: true });
            mockDatabase.validateData.mockResolvedValue({ isValid: true });
            
            // Act
            const result = await validator.validateBackup(testFile);
            
            // Assert
            expect(result.success).toBe(true);
            expect(mockDatabase.createContainer).toHaveBeenCalledTimes(1);
            expect(mockDatabase.restoreBackup).toHaveBeenCalledWith(
                testFile,
                expect.any(Object),
                'test-container'
            );
            expect(mockDatabase.cleanup).toHaveBeenCalledWith('test-container');
        });
        
        it('should handle container creation failures', async () => {
            // Test error scenarios
        });
    });
});
```

### Integration Test Structure

```javascript
// Example: test-backup-validator.js
const BackupValidator = require('./src/services/backup-validator');
const { DatabaseFactory } = require('./src/database');

describe('Backup Validator Integration', () => {
    let validator;
    let database;
    let factory;
    
    beforeAll(async () => {
        factory = new DatabaseFactory();
        database = factory.createDatabase('postgresql');
        validator = new BackupValidator(database);
    });
    
    afterAll(async () => {
        // Cleanup any remaining containers
        await cleanup();
    });
    
    it('should validate a real PostgreSQL backup file', async () => {
        const testBackupPath = './test-backups/sample-postgres.sql';
        const result = await validator.validateBackup(testBackupPath);
        
        expect(result.success).toBe(true);
        expect(result.containerName).toMatch(/test-/);
        expect(result.timings.restore).toBeLessThan(30000); // 30 seconds
        expect(result.validation.schema.isValid).toBe(true);
        expect(result.validation.data.isValid).toBe(true);
    }, 60000); // 60 second timeout for real Docker operations
});
```

## Coverage Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',           // Exclude server startup
        '!src/**/index.js',         // Exclude simple exports
        '!src/db/migrate.js',       // Exclude migration scripts
        '!src/db/seed.js'          // Exclude seed scripts
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
    verbose: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30000
};
```

### Coverage Thresholds

```javascript
// Add to jest.config.js for enforcing coverage minimums
coverageThreshold: {
    global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
    },
    './src/database/': {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
    }
}
```

## Test Environment Setup

### Global Test Setup (`src/__tests__/setup.js`)

```javascript
// Global test setup and teardown
const { execSync } = require('child_process');

beforeAll(async () => {
    // Ensure Docker is running
    try {
        execSync('docker --version', { stdio: 'ignore' });
    } catch (error) {
        throw new Error('Docker is required for integration tests');
    }
    
    // Setup test database
    process.env.DATABASE_URL = 'sqlite::memory:';
    process.env.NODE_ENV = 'test';
});

afterAll(async () => {
    // Cleanup any remaining test containers
    try {
        execSync('docker ps -q --filter "name=test-" | xargs -r docker rm -f', { stdio: 'ignore' });
    } catch (error) {
        console.warn('Failed to cleanup test containers:', error.message);
    }
});
```

### Test Data & Fixtures

```bash
# Test backup files location
test-backups/
├── sample-postgres.sql          # Small PostgreSQL backup
├── sample-postgres-large.sql    # Larger PostgreSQL backup
├── sample-mysql.sql            # MySQL backup for testing
├── corrupted-backup.sql        # Intentionally corrupted file
└── empty-backup.sql            # Empty backup file
```

## Database Abstraction Testing

### Testing the Factory Pattern

```javascript
// test-database-abstraction.js
const { DatabaseFactory, DatabaseConfig } = require('./src/database');

describe('Database Abstraction Layer', () => {
    let factory;
    
    beforeEach(() => {
        factory = new DatabaseFactory();
    });
    
    it('should create PostgreSQL database instance', () => {
        const db = factory.createDatabase('postgresql');
        expect(db.getDatabaseType()).toBe('postgresql');
        expect(db.getSupportedExtensions()).toContain('.sql');
    });
    
    it('should auto-detect database type from filename', () => {
        const pgDb = factory.createDatabaseFromFile('backup-postgres.sql');
        const mysqlDb = factory.createDatabaseFromFile('backup-mysql.sql');
        
        expect(pgDb.getDatabaseType()).toBe('postgresql');
        expect(mysqlDb.getDatabaseType()).toBe('mysql');
    });
    
    it('should detect database type from file content', () => {
        const pgContent = 'CREATE DATABASE test; SELECT pg_database_size(\'test\');';
        const mysqlContent = 'CREATE DATABASE test; SHOW TABLES;';
        
        const pgDb = factory.createDatabaseAuto({ fileContent: pgContent });
        const mysqlDb = factory.createDatabaseAuto({ fileContent: mysqlContent });
        
        expect(pgDb.getDatabaseType()).toBe('postgresql');
        expect(mysqlDb.getDatabaseType()).toBe('mysql');
    });
});
```

### Testing Database Implementations

```javascript
describe('PostgreSQL Database Implementation', () => {
    let database;
    let testId;
    
    beforeEach(() => {
        const factory = new DatabaseFactory();
        database = factory.createDatabase('postgresql');
        testId = `test-${Date.now()}`;
    });
    
    afterEach(async () => {
        // Cleanup test container
        try {
            await database.cleanup(`bg-test-${testId}`);
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    });
    
    it('should create and start PostgreSQL container', async () => {
        const container = await database.createContainer(testId);
        
        expect(container.containerName).toMatch(/bg-test-/);
        expect(container.connectionInfo.host).toBe('localhost');
        expect(container.connectionInfo.port).toBeGreaterThan(5432);
        expect(container.connectionInfo.user).toBe('testuser');
    }, 30000);
    
    it('should restore a PostgreSQL backup', async () => {
        const container = await database.createContainer(testId);
        const backupPath = './test-backups/sample-postgres.sql';
        
        const result = await database.restoreBackup(
            backupPath,
            container.connectionInfo,
            container.containerName
        );
        
        expect(result.success).toBe(true);
        expect(result.output).toContain('restore completed');
    }, 60000);
});
```

## Mocking & Test Doubles

### Docker Mocking for Unit Tests

```javascript
// Mock Docker operations for faster unit tests
jest.mock('child_process', () => ({
    exec: jest.fn(),
    execSync: jest.fn(),
    spawn: jest.fn()
}));

const { exec } = require('child_process');

beforeEach(() => {
    // Mock successful Docker operations
    exec.mockImplementation((command, callback) => {
        if (command.includes('docker run')) {
            callback(null, 'container_id_12345', '');
        } else if (command.includes('docker ps')) {
            callback(null, 'STATUS running', '');
        }
    });
});
```

### Database Connection Mocking

```javascript
// Mock database connections for isolated testing
const mockConnection = {
    query: jest.fn(),
    end: jest.fn(),
    connect: jest.fn()
};

jest.mock('pg', () => ({
    Client: jest.fn(() => mockConnection)
}));
```

## Performance Testing

### Test Performance Benchmarks

```javascript
describe('Performance Tests', () => {
    it('should create container within 10 seconds', async () => {
        const start = Date.now();
        const container = await database.createContainer(testId);
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(10000); // 10 seconds
        expect(container.containerName).toBeDefined();
    });
    
    it('should restore small backup within 30 seconds', async () => {
        const container = await database.createContainer(testId);
        const start = Date.now();
        
        const result = await database.restoreBackup(
            './test-backups/small-backup.sql',
            container.connectionInfo,
            container.containerName
        );
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(30000); // 30 seconds
        expect(result.success).toBe(true);
    });
});
```

## Continuous Integration

### GitHub Actions Test Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:latest
        options: --privileged
        
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
        
    - name: Install dependencies
      run: |
        cd backend
        npm ci
        
    - name: Run unit tests
      run: |
        cd backend
        npm run test:unit
        
    - name: Run integration tests
      run: |
        cd backend
        npm run test:integration
        
    - name: Generate coverage report
      run: |
        cd backend
        npm run test:coverage
        
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: backend/coverage/lcov.info
```

## Troubleshooting Tests

### Common Issues

1. **Docker not available**: Ensure Docker is installed and running
2. **Port conflicts**: Use different base ports for concurrent test runs
3. **Container cleanup**: Check for orphaned containers with `docker ps -a`
4. **File permissions**: Ensure test backup files are readable
5. **Memory issues**: Large backup files may require increased test timeouts

### Debug Commands

```bash
# Check for orphaned test containers
docker ps -a --filter "name=test-"

# Clean up all test containers
docker ps -q --filter "name=test-" | xargs -r docker rm -f

# View container logs
docker logs <container-name>

# Check available ports
netstat -tuln | grep :543

# Run tests with debug output
DEBUG=backup-guardian:* npm test
```

This comprehensive testing framework ensures BackupGuardian maintains high quality and reliability while supporting future database types and features.
