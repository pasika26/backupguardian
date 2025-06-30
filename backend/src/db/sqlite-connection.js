const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite database for testing
const dbPath = path.join(__dirname, '../../backup_guardian.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

console.log('Using SQLite database for testing:', dbPath);

module.exports = {
  query,
  run,
  close: () => db.close()
};
