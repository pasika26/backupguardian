# BackupGuardian CLI

A command-line tool for validating database backup files before migration.

## Installation

```bash
# Install globally via npm
npm install -g backup-guardian-cli

# Or use without installing
npx backup-guardian-cli validate backup.sql
```

## Quick Start

```bash
# Validate a SQL backup file
backup-guardian validate backup.sql

# Validate with specific database type
backup-guardian validate --type postgresql backup.dump

# Enable detailed validation
backup-guardian validate --schema-check --data-check backup.sql

# JSON output for CI/CD
backup-guardian validate --json backup.sql
```

## Commands

### `validate <file>`

Validate a database backup file.

**Options:**
- `-t, --type <type>` - Database type (postgresql, mysql, auto)
- `-s, --schema-check` - Enable detailed schema validation
- `-d, --data-check` - Enable data integrity checks  
- `--json` - Output results in JSON format
- `--verbose` - Enable verbose output

**Examples:**
```bash
# Basic validation
backup-guardian validate mybackup.sql

# PostgreSQL with schema validation
backup-guardian validate -t postgresql -s backup.dump

# Full validation with verbose output
backup-guardian validate --schema-check --data-check --verbose backup.sql

# CI/CD integration
backup-guardian validate --json backup.sql > validation-report.json
```

### `version`

Display version and system information.

```bash
backup-guardian version
```

## Supported File Types

- `.sql` - SQL dump files
- `.dump` - PostgreSQL custom format dumps
- `.backup` - Database backup files

## Requirements

- Node.js 16+
- Docker (for validation testing)

## Exit Codes

- `0` - Validation passed
- `1` - Validation failed or error occurred

## Integration

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Validate Database Backup
  run: |
    npx backup-guardian-cli validate --json backup.sql
    if [ $? -ne 0 ]; then
      echo "Backup validation failed"
      exit 1
    fi
```

### Scripts

```bash
#!/bin/bash
# Pre-migration validation script
echo "Validating backup before migration..."
backup-guardian validate --schema-check --data-check $1
if [ $? -eq 0 ]; then
  echo "✅ Backup is ready for migration"
else
  echo "❌ Backup validation failed - fix issues before migration"
  exit 1
fi
```

## Web Interface

For validation history, team collaboration, and advanced features, visit the [BackupGuardian web application](https://backup-guardian.com).

## Support

- [Documentation](https://docs.backup-guardian.com)
- [GitHub Issues](https://github.com/backup-guardian/backup-guardian/issues)
- [Community Discord](https://discord.gg/backup-guardian)
