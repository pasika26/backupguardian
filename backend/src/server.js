const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const { morganMiddleware, requestLogger } = require('./middleware/logger');
const logger = require('./utils/logger');

// Import routes
const userRoutes = require('./routes/users');
const backupRoutes = require('./routes/backups');
const testRunRoutes = require('./routes/testRuns');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-run migrations on startup in production
if (process.env.NODE_ENV === 'production' && process.env.USE_POSTGRESQL === 'true') {
  const { runMigration } = require('./db/migrate');
  
  // Run migrations before starting server
  runMigration().then(() => {
    console.log('✅ Database migrations completed');
  }).catch((error) => {
    console.error('❌ Migration failed:', error.message);
    // Don't exit - let health check handle database connectivity
  });
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logging middleware
app.use(morganMiddleware);
app.use(requestLogger);

// Health check (before auth)
app.use('/health', healthRoutes);

// API routes
app.use('/api/users', userRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/test-runs', testRunRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`,
    apiBase: `http://localhost:${PORT}/api`,
    category: 'startup'
  });
  
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});

module.exports = app;
