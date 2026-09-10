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
    // --- Settings: Account / Business Profile / Alerts & Thresholds ---
    { table: 'business', col: 'country', ddl: 'TEXT' },
    { table: 'business', col: 'deleted_at', ddl: 'TIMESTAMPTZ' },
    // Existing accounts predate confirmation and remain usable. The default is
    // reset to FALSE below so every account created after this migration must
    // confirm its email address.
    { table: 'user', col: 'email_verified', ddl: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    {
      table: 'business',
      col: 'alert_settings',
      ddl: `JSONB DEFAULT '{"runway_threshold_days":3,"types":{"low_stock":true,"payment_overdue":true,"anomaly":true}}'`,
    },
    // --- Alerts: resolved/active model (see big comment block below) ---
    { table: 'alert', col: 'resolved', ddl: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { table: 'alert', col: 'updated_at', ddl: 'TIMESTAMPTZ DEFAULT NOW()' },
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

  await query(`ALTER TABLE "user" ALTER COLUMN email_verified SET DEFAULT FALSE;`);

  await migrateAlertActiveModel();
}

/**
 * ALERT DEDUPE — resolved-based, replacing the earlier read-based attempt.
 *
 * The bug: `read` was being asked to mean two different things — "has a
 * human seen this" and "is the underlying problem still happening" — and
 * those are NOT the same thing. Visiting /alerts calls markAllRead(),
 * which sets read=true on every alert, including ones whose real-world
 * condition (butter still low) hasn't changed at all. The dedupe check
 * that guarded alert creation was `WHERE type=X AND related_entity_id=Y
 * AND read=false` — so the moment you viewed the page, that check found
 * zero rows and let a brand new duplicate get inserted on the very next
 * sync pass (which runs on every alert fetch). A partial unique index on
 * `read=false` only stops truly simultaneous inserts; it does nothing
 * once read has already been flipped to true by a normal page visit.
 *
 * The fix: `resolved` is now the ONLY signal for "is this still an
 * active problem." It is set exclusively by the sync functions in
 * alertService.js, only when the real number changes (stock recovers,
 * invoice gets paid) — markAsRead/markAllRead never touch it. Dedup is
 * enforced by a partial UNIQUE INDEX on
 * (business_id, type, related_entity_id) WHERE resolved = false, so at
 * most one active row can exist per real-world issue, full stop,
 * regardless of read state or how many times the sync runs.
 *
 * Guarded by checking whether idx_alert_active_unique already exists, so
 * this only runs its one-time backfill once, not on every server boot
 * (which would otherwise keep resetting resolved back to true on every
 * restart and hide genuinely active alerts).
 */
async function migrateAlertActiveModel() {
  // The old read-based index/approach is superseded — drop it so it can't
  // interfere with or duplicate-guard against the new resolved-based one.
  await query(`DROP INDEX IF EXISTS idx_alert_unique_unread;`);

  const { rows: existingIndex } = await query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alert_active_unique'`
  );
  if (existingIndex.length > 0) return; // already migrated, nothing to do

  // Historical rows predate the resolved/active model and include real
  // duplicates accumulated by the old bug — there's no reliable way to
  // know which ones are "really" still active from data alone. Mark
  // everything resolved so the slate is clean; the very next call to
  // AlertService.getAllAlerts()/getUnreadCount() re-derives whichever
  // alerts are genuinely active right now (real stock levels, real
  // consumption rates, real overdue orders) from scratch — this time
  // deduplicated for good by the index below.
  await query(`UPDATE alert SET resolved = true, updated_at = NOW() WHERE resolved = false;`);

  await query(`
    CREATE UNIQUE INDEX idx_alert_active_unique
    ON alert (business_id, type, related_entity_id)
    WHERE resolved = false;
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
