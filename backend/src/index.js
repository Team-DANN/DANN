const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { initDb } = require('./db/database');
const { authMiddleware } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const productRoutes = require('./routes/productRoutes');
const batchRoutes = require('./routes/batchRoutes');
const retailerRoutes = require('./routes/retailerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Initialize Database Schema & Tables.
// initDb() is async (two round trips to Supabase: schema + migrations), so it
// must be awaited before the server starts accepting traffic — otherwise
// requests (or test suites importing `app` directly) could hit tables that
// don't exist yet. dbReady is also attached to `app` so test files can
// `await app.dbReady` before making requests against a supertest instance,
// instead of duplicating their own initDb() call.
const dbReady = initDb().catch((err) => {
  console.error('[DANN Backend] Database initialization failed:', err);
  throw err;
});
app.dbReady = dbReady;

// Service Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'DANN Core Business & Production API',
    tenant_scope: req.business_id,
    timestamp: new Date().toISOString(),
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);

// Error Handler Middleware
app.use(errorHandler);

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`[DANN Backend] Server active and listening on http://localhost:${env.PORT}`);
      });
    })
    .catch(() => {
      // initDb() already logged the error above — exit rather than serve
      // traffic against a database that never finished initializing.
      process.exit(1);
    });
}

module.exports = app;