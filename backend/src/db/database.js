const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    '[DB] DATABASE_URL is not set. Copy it from Supabase (Project Settings > Database > ' +
    'Connection string) into backend/.env — see .env.example.'
  );
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });
  }
  return pool;
}

async function query(sql, params = []) {
  return getPool().query(sql, params);
}

async function getClient() {
  return getPool().connect();
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await query(schemaSql);
  await runMigrations();
  console.log('[DB] Database tables initialized & migrated successfully (Supabase/PostgreSQL).');
}

async function runMigrations() {
  const migrations = [
    { table: 'product', col: 'current_stock', ddl: 'NUMERIC(12,4) NOT NULL DEFAULT 0.0' },
    { table: 'material_restock_log', col: 'type', ddl: "TEXT DEFAULT 'purchase'" },
    { table: 'production_log', col: 'labor_cost', ddl: 'NUMERIC(12,4) DEFAULT 0.0' },
    { table: 'production_log', col: 'total_material_cost', ddl: 'NUMERIC(12,4) DEFAULT 0.0' },
    // --- Added for Settings: Account / Business Profile / Alerts & Thresholds ---
    { table: 'business', col: 'country', ddl: 'TEXT' },
    { table: 'business', col: 'deleted_at', ddl: 'TIMESTAMPTZ' },
    {
      table: 'business',
      col: 'alert_settings',
      ddl: `JSONB DEFAULT '{"runway_threshold_days":3,"types":{"low_stock":true,"payment_overdue":true,"anomaly":true}}'`,
    },
  ];

  for (const m of migrations) {
    const { rows } = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [m.table, m.col]
    );
    if (rows.length === 0) {
      await query(`ALTER TABLE "${m.table}" ADD COLUMN IF NOT EXISTS ${m.col} ${m.ddl};`);
    }
  }

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_unique_unread
    ON alert (business_id, type, related_entity_id)
    WHERE read = false;
  `);

  await query(`
    UPDATE alert a
    SET read = true
    WHERE a.read = false
      AND a.alert_id NOT IN (
        SELECT DISTINCT ON (business_id, type, related_entity_id) alert_id
        FROM alert
        WHERE read = false
        ORDER BY business_id, type, related_entity_id, created_at DESC
      );
  `);
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query,
  getClient,
  initDb,
  closeDb,
};