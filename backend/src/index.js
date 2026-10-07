const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { initDb } = require('./db/database');
const { authMiddleware, requireAuth } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const staffRoutes = require('./routes/staffRoutes');
const materialRoutes = require('./routes/materialRoutes');
const productRoutes = require('./routes/productRoutes');
const batchRoutes = require('./routes/batchRoutes');
const retailerRoutes = require('./routes/retailerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const alertRoutes = require('./routes/alertRoutes');
const businessRoutes = require('./routes/businessRoutes');
const ocrCaptureRoutes = require('./routes/ocrCaptureRoutes');
const productPhotoRoutes = require('./routes/productPhotoRoutes');
const migrationRoutes = require('./routes/migrationRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
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
    tenant_scope: req.business_id ?? null,
    timestamp: new Date().toISOString(),
  });
});

// Public and self-guarded: these routers apply requireAuth per route.
app.use('/api/auth', authRoutes);
app.use('/api/auth', staffAuthRoutes);

// Everything below requires a valid access token.
app.use('/api/staff', requireAuth, staffRoutes);
app.use('/api/materials', requireAuth, materialRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/batches', requireAuth, batchRoutes);
app.use('/api/retailers', requireAuth, retailerRoutes);
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/alerts', requireAuth, alertRoutes);
app.use('/api/business', requireAuth, businessRoutes);
app.use('/api/ocr-captures', requireAuth, ocrCaptureRoutes);
app.use('/api/product-photo', requireAuth, productPhotoRoutes);
app.use('/api/migrations', requireAuth, migrationRoutes);

// errorHandler MUST be last: it only catches errors from routes
// registered above it in the middleware stack.
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