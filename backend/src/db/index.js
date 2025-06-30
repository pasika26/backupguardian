/**
 * Database connection manager
 * Switches between PostgreSQL and SQLite based on environment
 */
require('dotenv').config();

let db;

if (process.env.USE_POSTGRESQL === 'true') {
  console.log('Using PostgreSQL database');
  db = require('./connection');
} else {
  console.log('Using SQLite database for testing');
  db = require('./sqlite-connection');
}

module.exports = db;
