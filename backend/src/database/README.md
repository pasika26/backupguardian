# Database Abstraction Layer

This directory contains the database abstraction layer for BackupGuardian, providing a unified interface for working with different database types during backup validation.

## Architecture Overview

The abstraction layer follows these design patterns:

- **Abstract Base Class**: `BaseDatabase` defines the common interface
- **Concrete Implementations**: Database-specific classes (PostgreSQL, MySQL)
- **Factory Pattern**: `DatabaseFactory` for creating database instances
- **Configuration Management**: `DatabaseConfig` for centralized settings

## Directory Structure

```
src/database/
├── base-database.js        # Abstract base class with common interface
├── postgresql-database.js  # PostgreSQL implementation (migrated from existing code)
├── mysql-database.js       # MySQL implementation (placeholder)
├── database-factory.js     # Factory pattern for database selection
├── database-config.js      # Configuration management
├── index.js               # Main exports
└── README.md              # This documentation
```

## Usage

### Basic Usage

```javascript
const { DatabaseFactory } = require('./src/database');

// Create a PostgreSQL database instance
const factory = new DatabaseFactory();
const database = factory.createDatabase('postgresql');

// Use the database for backup validation
const container = await database.createContainer('test-123');
const result = await database.restoreBackup('/path/to/backup.sql', 
  container.connectionInfo, container.containerName);
```

### Auto-Detection

```javascript
// Automatically detect database type from file
const database = factory.createDatabaseFromFile('/path/to/backup.sql');

// Or use automatic detection with options
const database = factory.createDatabaseAuto({
  filePath: '/path/to/backup.sql',
  config: { basePort: 5500 }
});
```

### Configuration

```javascript
const { DatabaseConfig } = require('./src/database');

const config = new DatabaseConfig();
const pgConfig = config.getConfig('postgresql', {
  basePort: 5500,
  password: 'custom-password'
});
```

## Interface Documentation

### BaseDatabase (Abstract Class)

All database implementations must implement these methods:

#### Container Management
- `createContainer(testId)` - Create and start a database test container
- `waitForContainer(containerName, maxAttempts)` - Wait for container to be ready
- `cleanup(containerName)` - Clean up container and resources

#### Backup Operations
- `restoreBackup(backupFilePath, connectionInfo, containerName)` - Restore backup to container
- `validateData(connectionInfo, containerName, options)` - Validate data integrity
- `validateSchema(connectionInfo, containerName, originalSchema)` - Validate schema

#### Information Methods
- `getConnectionInfo(testId)` - Get connection information
- `getDatabaseType()` - Get database type identifier
- `getSupportedExtensions()` - Get supported file extensions

### PostgreSQLDatabase

PostgreSQL-specific implementation supporting:
- **File Types**: `.sql`, `.dump`, `.backup`
- **Container**: `postgres:15-alpine`
- **Tools**: `psql`, `pg_restore`, `pg_isready`

### MySQLDatabase (Placeholder)

MySQL implementation structure (to be completed):
- **File Types**: `.sql`, `.dump`
- **Container**: `mysql:8.0`
- **Tools**: `mysql`, `mysqldump`, `mysqladmin`

## Migration from Legacy Code

### What Was Moved

The database abstraction layer consolidates functionality from:

1. **DockerRunner** (`src/services/docker-runner.js`):
   - Container creation and management
   - Port allocation
   - Container lifecycle management

2. **RestoreAutomation** (`src/services/restore-automation.js`):
   - Backup restoration logic
   - File type detection and handling
   - Database validation

3. **Backup Validator Integration**:
   - Updated to use database factory
   - Maintains all existing functionality
   - Added support for multiple database types

### Legacy Compatibility

Legacy wrappers are provided for backward compatibility:
- `docker-runner-legacy.js` - Wraps PostgreSQLDatabase for old DockerRunner interface
- `restore-automation-legacy.js` - Wraps PostgreSQLDatabase for old RestoreAutomation interface

### Migration Path

**Before** (legacy):
```javascript
const DockerRunner = require('./docker-runner');
const RestoreAutomation = require('./restore-automation');

const dockerRunner = new DockerRunner();
const restoreAutomation = new RestoreAutomation();

const container = await dockerRunner.createContainer(testId);
const result = await restoreAutomation.executeRestore(backupPath, connectionInfo, containerName);
```

**After** (new abstraction):
```javascript
const { DatabaseFactory } = require('./src/database');

const factory = new DatabaseFactory();
const database = factory.createDatabase('postgresql');

const container = await database.createContainer(testId);
const result = await database.restoreBackup(backupPath, connectionInfo, containerName);
```

## Configuration Options

### PostgreSQL Configuration

```javascript
{
  image: 'postgres:15-alpine',
  port: 5432,
  user: 'testuser',
  database: 'testdb',
  password: 'testpass123',
  basePort: 5433
}
```

### MySQL Configuration

```javascript
{
  image: 'mysql:8.0',
  port: 3306,
  user: 'testuser',
  database: 'testdb',
  password: 'testpass123',
  rootPassword: 'rootpass123',
  basePort: 3307
}
```

### Environment Variables

You can override default configurations using environment variables:

- `POSTGRES_TEST_IMAGE` - PostgreSQL Docker image
- `POSTGRES_TEST_USER` - PostgreSQL test user
- `POSTGRES_TEST_PASSWORD` - PostgreSQL test password
- `POSTGRES_TEST_BASE_PORT` - PostgreSQL base port for allocation

- `MYSQL_TEST_IMAGE` - MySQL Docker image
- `MYSQL_TEST_USER` - MySQL test user
- `MYSQL_TEST_ROOT_PASSWORD` - MySQL root password
- `MYSQL_TEST_BASE_PORT` - MySQL base port for allocation

## Testing

### Running Tests

```bash
# Test the abstraction layer
node test-database-abstraction.js

# Test integration with BackupValidator
node test-backup-validation-integration.js

# Run existing unit tests (some may need updates)
npm test
```

### Test Coverage

The abstraction layer includes tests for:
- Database factory creation
- Configuration management
- Auto-detection logic
- Interface compliance
- Legacy compatibility
- Integration with existing services

## Future Enhancements

### Planned Features

1. **Complete MySQL Implementation**
   - Finish MySQL restore logic
   - Add MySQL-specific validation
   - Test with real MySQL backups

2. **Additional Database Support**
   - SQLite support for local testing
   - MongoDB support for document databases
   - Redis support for key-value stores

3. **Enhanced Auto-Detection**
   - Content analysis for better type detection
   - Support for compressed backup files
   - Multi-database backup file support

4. **Performance Optimizations**
   - Connection pooling
   - Parallel container creation
   - Caching for repeated operations

### Contributing

When adding new database types:

1. Extend `BaseDatabase` class
2. Implement all required abstract methods
3. Add configuration template to `DatabaseConfig`
4. Register in `DatabaseFactory`
5. Add comprehensive tests
6. Update documentation

## Error Handling

The abstraction layer provides consistent error handling:

- **Container Errors**: Wrapped with descriptive messages
- **Restore Errors**: Detailed output and error analysis
- **Validation Errors**: Structured error reporting
- **Configuration Errors**: Validation with specific error details

All errors maintain backward compatibility with existing error handling in BackupValidator.
