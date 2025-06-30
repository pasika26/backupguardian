# BackupGuardian Data Flow Diagrams

## System Overview Flow

```mermaid
graph TB
    subgraph "User Interface"
        UI[Web Dashboard]
        UPLOAD[File Upload]
    end
    
    subgraph "API Layer"
        API[Express API]
        AUTH[Authentication]
        QUEUE[Bull.js Queue]
    end
    
    subgraph "Database Abstraction"
        FACTORY[Database Factory]
        DETECT[Auto-Detection]
        PGDB[PostgreSQL Database]
        MYDB[MySQL Database]
        CONFIG[Configuration]
    end
    
    subgraph "Validation Engine"
        VALIDATOR[Backup Validator]
        RESTORE[Restore Process]
        VALIDATE[Data Validation]
        SCHEMA[Schema Validation]
    end
    
    subgraph "Infrastructure"
        DOCKER[Docker Runtime]
        STORAGE[File Storage]
        RESULTS[Results Storage]
        CLEANUP[Cleanup Service]
        EMAIL[Email Service]
    end
    
    UI --> UPLOAD
    UPLOAD --> API
    API --> AUTH
    AUTH --> QUEUE
    QUEUE --> VALIDATOR
    
    VALIDATOR --> FACTORY
    FACTORY --> DETECT
    DETECT --> PGDB
    DETECT --> MYDB
    PGDB --> CONFIG
    MYDB --> CONFIG
    
    VALIDATOR --> RESTORE
    RESTORE --> DOCKER
    DOCKER --> VALIDATE
    VALIDATE --> SCHEMA
    SCHEMA --> RESULTS
    
    RESULTS --> EMAIL
    DOCKER --> CLEANUP
    RESULTS --> STORAGE
```

## Backup Validation Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Queue
    participant Factory as Database Factory
    participant Database
    participant Docker
    participant Validator
    participant Results
    participant Email
    
    User->>API: Upload backup file
    API->>API: Authenticate user
    API->>Queue: Add validation job
    
    Queue->>Validator: Process validation job
    Validator->>Factory: createDatabaseFromFile()
    
    Factory->>Factory: Analyze file type
    Factory->>Database: Create database instance
    
    Validator->>Database: createContainer()
    Database->>Docker: docker run <db-image>
    Docker-->>Database: Container created
    Database-->>Validator: Connection info
    
    Validator->>Database: restoreBackup()
    Database->>Docker: Execute restore command
    Docker-->>Database: Restore results
    Database-->>Validator: Restore status
    
    Validator->>Database: validateData()
    Database->>Docker: Query data integrity
    Docker-->>Database: Data validation results
    Database-->>Validator: Validation results
    
    Validator->>Database: validateSchema()
    Database->>Docker: Query schema structure
    Docker-->>Database: Schema validation results
    Database-->>Validator: Schema results
    
    Validator->>Results: Store validation results
    Results-->>Validator: Results stored
    
    Validator->>Database: cleanup()
    Database->>Docker: docker rm container
    Docker-->>Database: Container removed
    
    Validator->>Email: Send notification
    Email-->>User: Email notification
    
    API-->>User: Return validation results
```

## Database Auto-Detection Flow

```mermaid
flowchart TD
    START[Upload Backup File] --> FACTORY[Database Factory]
    
    FACTORY --> FILENAME{Check Filename}
    FILENAME -->|Contains 'postgres'| PG_DETECTED[PostgreSQL Detected]
    FILENAME -->|Contains 'mysql'| MYSQL_DETECTED[MySQL Detected]
    FILENAME -->|No indicators| EXTENSION{Check Extension}
    
    EXTENSION -->|.sql| CONTENT_ANALYSIS[Analyze File Content]
    EXTENSION -->|.dump/.backup| PG_DETECTED
    EXTENSION -->|.mysqldump| MYSQL_DETECTED
    EXTENSION -->|Unknown| DEFAULT[Default to PostgreSQL]
    
    CONTENT_ANALYSIS --> SCORE[Score Indicators]
    SCORE --> PG_SCORE{PostgreSQL Score}
    SCORE --> MYSQL_SCORE{MySQL Score}
    
    PG_SCORE -->|Higher| PG_DETECTED
    MYSQL_SCORE -->|Higher| MYSQL_DETECTED
    PG_SCORE -->|Equal| PG_DETECTED
    
    PG_DETECTED --> PG_CONFIG[PostgreSQL Configuration]
    MYSQL_DETECTED --> MYSQL_CONFIG[MySQL Configuration]
    DEFAULT --> PG_CONFIG
    
    PG_CONFIG --> PG_INSTANCE[PostgreSQL Database Instance]
    MYSQL_CONFIG --> MYSQL_INSTANCE[MySQL Database Instance]
    
    PG_INSTANCE --> VALIDATION[Start Validation Process]
    MYSQL_INSTANCE --> VALIDATION
```

## Container Lifecycle Management

```mermaid
stateDiagram-v2
    [*] --> Requested
    
    Requested --> Creating : Factory.createContainer()
    Creating --> Starting : docker run command
    Starting --> Waiting : Container starting
    Waiting --> Ready : Health check passed
    
    Ready --> Restoring : Execute restore
    Restoring --> Validating : Restore complete
    Validating --> Complete : Validation done
    
    Creating --> Failed : Docker error
    Starting --> Failed : Startup timeout
    Waiting --> Failed : Health check failed
    Restoring --> Failed : Restore error
    Validating --> Failed : Validation error
    
    Complete --> Cleaning : cleanup()
    Failed --> Cleaning : cleanup()
    
    Cleaning --> Removed : docker rm
    Removed --> [*]
    
    note right of Ready
        Container is ready to accept
        backup restore operations
    end note
    
    note right of Failed
        Any failure triggers
        automatic cleanup
    end note
```

## Data Validation Process

```mermaid
graph TB
    subgraph "Backup File"
        FILE[Backup File]
        TYPE[File Type Detection]
    end
    
    subgraph "Container Setup"
        CONTAINER[Create Container]
        WAIT[Wait for Ready]
        CONNECT[Establish Connection]
    end
    
    subgraph "Restore Process"
        RESTORE[Execute Restore]
        CHECK[Check Restore Status]
        LOGS[Capture Logs]
    end
    
    subgraph "Validation Checks"
        SCHEMA[Schema Validation]
        DATA[Data Validation]
        INTEGRITY[Integrity Checks]
        SAMPLING[Data Sampling]
    end
    
    subgraph "Results"
        SUCCESS[Success Report]
        FAILURE[Failure Report]
        METRICS[Performance Metrics]
        CLEANUP[Container Cleanup]
    end
    
    FILE --> TYPE
    TYPE --> CONTAINER
    CONTAINER --> WAIT
    WAIT --> CONNECT
    CONNECT --> RESTORE
    RESTORE --> CHECK
    CHECK --> LOGS
    
    LOGS --> SCHEMA
    SCHEMA --> DATA
    DATA --> INTEGRITY
    INTEGRITY --> SAMPLING
    
    SAMPLING --> SUCCESS
    SAMPLING --> FAILURE
    SUCCESS --> METRICS
    FAILURE --> METRICS
    METRICS --> CLEANUP
```

## Testing Framework Integration

```mermaid
graph LR
    subgraph "Test Types"
        UNIT[Unit Tests]
        INTEGRATION[Integration Tests]
        E2E[End-to-End Tests]
    end
    
    subgraph "Test Framework"
        JEST[Jest Runner]
        COVERAGE[Coverage Reporter]
        MOCKS[Mock Services]
    end
    
    subgraph "Test Targets"
        FACTORY[Database Factory]
        DATABASE[Database Classes]
        VALIDATOR[Backup Validator]
        API[API Endpoints]
    end
    
    subgraph "Test Environment"
        DOCKER[Docker Containers]
        TESTDB[Test Databases]
        FIXTURES[Test Fixtures]
    end
    
    UNIT --> JEST
    INTEGRATION --> JEST
    E2E --> JEST
    
    JEST --> COVERAGE
    JEST --> MOCKS
    
    JEST --> FACTORY
    JEST --> DATABASE
    JEST --> VALIDATOR
    JEST --> API
    
    INTEGRATION --> DOCKER
    E2E --> DOCKER
    DOCKER --> TESTDB
    TESTDB --> FIXTURES
```

## Error Handling Flow

```mermaid
flowchart TD
    START[Validation Request] --> TRY[Try Validation]
    
    TRY --> CONTAINER{Container Created?}
    CONTAINER -->|No| CONTAINER_ERROR[Container Creation Error]
    CONTAINER -->|Yes| RESTORE{Restore Success?}
    
    RESTORE -->|No| RESTORE_ERROR[Restore Error]
    RESTORE -->|Yes| VALIDATE{Validation Success?}
    
    VALIDATE -->|No| VALIDATION_ERROR[Validation Error]
    VALIDATE -->|Yes| SUCCESS[Validation Success]
    
    CONTAINER_ERROR --> LOG_ERROR[Log Error Details]
    RESTORE_ERROR --> LOG_ERROR
    VALIDATION_ERROR --> LOG_ERROR
    
    LOG_ERROR --> CLEANUP[Cleanup Resources]
    SUCCESS --> CLEANUP
    
    CLEANUP --> NOTIFY[Notify User]
    NOTIFY --> STORE[Store Results]
    STORE --> END[Complete]
    
    subgraph "Error Categories"
        CONTAINER_ERROR --> E1[Port conflicts<br/>Docker issues<br/>Image pull failures]
        RESTORE_ERROR --> E2[Invalid backup file<br/>Permission issues<br/>Corruption detected]
        VALIDATION_ERROR --> E3[Connection failures<br/>Query timeouts<br/>Data inconsistencies]
    end
    
    subgraph "Recovery Actions"
        CLEANUP --> R1[Remove containers<br/>Clean temp files<br/>Release ports]
        NOTIFY --> R2[Email alerts<br/>Dashboard updates<br/>Log entries]
    end
```

## Multi-Database Support Flow

```mermaid
graph TB
    subgraph "File Upload"
        UPLOAD[User Uploads File]
        ANALYZE[File Analysis]
    end
    
    subgraph "Detection Engine"
        FILENAME[Filename Check]
        CONTENT[Content Analysis]
        SCORING[Indicator Scoring]
    end
    
    subgraph "Database Factory"
        FACTORY[Database Factory]
        PG[PostgreSQL DB]
        MYSQL[MySQL DB]
        FUTURE[Future DBs]
    end
    
    subgraph "Configuration"
        PG_CONFIG[PostgreSQL Config]
        MYSQL_CONFIG[MySQL Config]
        ENV_CONFIG[Environment Config]
    end
    
    subgraph "Validation Process"
        CREATE[Create Container]
        RESTORE[Restore Backup]
        VALIDATE[Validate Data]
        RESULTS[Generate Results]
    end
    
    UPLOAD --> ANALYZE
    ANALYZE --> FILENAME
    ANALYZE --> CONTENT
    FILENAME --> SCORING
    CONTENT --> SCORING
    
    SCORING --> FACTORY
    FACTORY --> PG
    FACTORY --> MYSQL
    FACTORY --> FUTURE
    
    PG --> PG_CONFIG
    MYSQL --> MYSQL_CONFIG
    PG_CONFIG --> ENV_CONFIG
    MYSQL_CONFIG --> ENV_CONFIG
    
    ENV_CONFIG --> CREATE
    CREATE --> RESTORE
    RESTORE --> VALIDATE
    VALIDATE --> RESULTS
```

## Performance Monitoring Flow

```mermaid
graph TB
    subgraph "Metrics Collection"
        START_TIME[Record Start Time]
        CONTAINER_TIME[Container Creation Time]
        RESTORE_TIME[Restore Duration]
        VALIDATION_TIME[Validation Duration]
        CLEANUP_TIME[Cleanup Duration]
        TOTAL_TIME[Total Duration]
    end
    
    subgraph "Resource Monitoring"
        CPU[CPU Usage]
        MEMORY[Memory Usage]
        DISK[Disk I/O]
        NETWORK[Network I/O]
    end
    
    subgraph "Performance Analysis"
        THRESHOLDS[Check Thresholds]
        TRENDS[Analyze Trends]
        ALERTS[Performance Alerts]
    end
    
    subgraph "Optimization"
        SCALE[Scale Resources]
        OPTIMIZE[Optimize Queries]
        CACHE[Implement Caching]
    end
    
    START_TIME --> CONTAINER_TIME
    CONTAINER_TIME --> RESTORE_TIME
    RESTORE_TIME --> VALIDATION_TIME
    VALIDATION_TIME --> CLEANUP_TIME
    CLEANUP_TIME --> TOTAL_TIME
    
    TOTAL_TIME --> CPU
    CPU --> MEMORY
    MEMORY --> DISK
    DISK --> NETWORK
    
    NETWORK --> THRESHOLDS
    THRESHOLDS --> TRENDS
    TRENDS --> ALERTS
    
    ALERTS --> SCALE
    ALERTS --> OPTIMIZE
    ALERTS --> CACHE
```

## Security & Isolation Flow

```mermaid
graph TB
    subgraph "Upload Security"
        UPLOAD[File Upload]
        SIZE[Size Validation]
        TYPE[Type Validation]
        SCAN[Malware Scan]
    end
    
    subgraph "Container Isolation"
        NETWORK[Network Isolation]
        PORTS[Random Port Assignment]
        RESOURCES[Resource Limits]
        TEMP[Temporary Storage]
    end
    
    subgraph "Data Protection"
        ENCRYPTION[Data Encryption]
        ACCESS[Access Control]
        AUDIT[Audit Logging]
        CLEANUP[Secure Cleanup]
    end
    
    subgraph "Monitoring"
        ACTIVITY[Activity Monitoring]
        ALERTS[Security Alerts]
        LOGS[Security Logs]
    end
    
    UPLOAD --> SIZE
    SIZE --> TYPE
    TYPE --> SCAN
    SCAN --> NETWORK
    
    NETWORK --> PORTS
    PORTS --> RESOURCES
    RESOURCES --> TEMP
    
    TEMP --> ENCRYPTION
    ENCRYPTION --> ACCESS
    ACCESS --> AUDIT
    AUDIT --> CLEANUP
    
    CLEANUP --> ACTIVITY
    ACTIVITY --> ALERTS
    ALERTS --> LOGS
```

These diagrams provide a comprehensive view of how data flows through BackupGuardian's new architecture, highlighting the database abstraction layer, testing framework integration, and multi-database support capabilities.
