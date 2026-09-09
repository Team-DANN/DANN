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
const businessRoutes = require('./routes/businessRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

const dbReady = initDb().catch((err) => {
  console.error('[DANN Backend] Database initialization failed:', err);
  throw err;
});
app.dbReady = dbReady;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'DANN Core Business & Production API',
    tenant_scope: req.business_id,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/business', businessRoutes);

app.use(errorHandler);

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`[DANN Backend] Server active and listening on http://localhost:${env.PORT}`);
      });
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = app;