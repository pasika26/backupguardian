/**
 * Database abstraction layer entry point
 * Provides convenient exports for all database-related classes
 */

const BaseDatabase = require('./base-database');
const PostgreSQLDatabase = require('./postgresql-database');
const MySQLDatabase = require('./mysql-database');
const DatabaseFactory = require('./database-factory');
const DatabaseConfig = require('./database-config');

module.exports = {
  BaseDatabase,
  PostgreSQLDatabase,
  MySQLDatabase,
  DatabaseFactory,
  DatabaseConfig,
  
  // Convenience factory functions
  createDatabase: (type, config) => {
    const factory = new DatabaseFactory();
    return factory.createDatabase(type, config);
  },
  
  createDatabaseFromFile: (filePath, config) => {
    const factory = new DatabaseFactory();
    return factory.createDatabaseFromFile(filePath, config);
  },
  
  createDatabaseAuto: (options) => {
    const factory = new DatabaseFactory();
    return factory.createDatabaseAuto(options);
  },
  
  getConfig: (type, overrides) => {
    const config = new DatabaseConfig();
    return config.getConfig(type, overrides);
  }
};
