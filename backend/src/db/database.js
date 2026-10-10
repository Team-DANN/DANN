const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
const { generateBusinessCode } = require('../utils/businessCode');
const { migrateAgentActions } = require('./agentMigrations');
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
    {
      table: 'business',
      col: 'onboarding_config',
      ddl: `JSONB DEFAULT '{"completed":false}'`,
    },
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
    // --- Staff access (see migrateStaffAccess below) ---
    // Existing users all become status 'active' via the column default.
    // modules NULL means "every module" (owner); staff carry an explicit
    // JSON array such as ["production","orders"].
    { table: 'user', col: 'username', ddl: 'TEXT' },
    { table: 'user', col: 'status', ddl: "TEXT NOT NULL DEFAULT 'active'" },
    { table: 'user', col: 'modules', ddl: 'JSONB' },
    { table: 'user', col: 'created_by', ddl: 'TEXT' },
    { table: 'user', col: 'terminated_at', ddl: 'TIMESTAMPTZ' },
    { table: 'user', col: 'terminated_by', ddl: 'TEXT' },
    { table: 'user', col: 'failed_pin_attempts', ddl: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'user', col: 'locked_until', ddl: 'TIMESTAMPTZ' },
    // Set on a staff member's first successful sign-in. Until then the
    // owner may still reset their PIN; afterwards the PIN is theirs.
    { table: 'user', col: 'first_login_at', ddl: 'TIMESTAMPTZ' },
    { table: 'business', col: 'business_code', ddl: 'TEXT' },
    // Lets production staff undo only the materials they created
    // themselves (photo-import rollback).
    { table: 'material', col: 'created_by', ddl: 'TEXT' },
    // --- Editable production logs (see migrateProductionEdits below) ---
    { table: 'production_log', col: 'edited_at', ddl: 'TIMESTAMPTZ' },
    { table: 'production_log', col: 'edited_by', ddl: 'TEXT' },
    { table: 'production_log', col: 'edit_count', ddl: 'INTEGER NOT NULL DEFAULT 0' },
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

  await query(`ALTER TABLE "user" ALTER COLUMN email_verified SET DEFAULT TRUE;`);
  await query(`UPDATE "user" SET email_verified = TRUE WHERE email_verified = FALSE;`);

  await migrateStaffAccess();
  await migrateProductionEdits();
  await migrateAgentActions(query);
  await migrateAlertActiveModel();
}

/**
 * STAFF ACCESS — indexes and backfill.
 *
 * The columns themselves are added by the migrations list above. The
 * indexes live here instead of schema.sql for the same reason
 * idx_alert_active_unique does: schema.sql runs BEFORE runMigrations(),
 * so an index on a column that doesn't exist yet on an existing database
 * would crash startup.
 *
 *  - business_code is the short code staff type at login. Unique, but
 *    nullable until backfilled.
 *  - usernames are unique per business among ACTIVE accounts only,
 *    case-insensitively. A removed (terminated) staff member's username
 *    becomes free again, so "forgot my PIN" is solved by removing the
 *    account and adding the person again with the same username. Two
 *    different bakeries can also each have a "ravi".
 *
 * Safe to run on every boot: the indexes are IF NOT EXISTS, and the
 * backfill only touches businesses that still have no code (which also
 * covers accounts registered before register() assigns one itself).
 */
async function migrateStaffAccess() {
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_business_code_unique
    ON business (business_code)
    WHERE business_code IS NOT NULL;
  `);

  // Replaces the earlier all-statuses version of this index.
  await query(`DROP INDEX IF EXISTS idx_user_business_username;`);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_business_username_active
    ON "user" (business_id, LOWER(username))
    WHERE username IS NOT NULL AND status = 'active';
  `);

  await backfillBusinessCodes();
}

async function backfillBusinessCodes() {
  const { rows } = await query(`SELECT business_id FROM business WHERE business_code IS NULL`);

  for (const { business_id } of rows) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        // `AND business_code IS NULL` keeps two servers booting at the
        // same moment from overwriting each other's code.
        await query(
          `UPDATE business SET business_code = $1 WHERE business_id = $2 AND business_code IS NULL`,
          [generateBusinessCode(), business_id]
        );
        break;
      } catch (err) {
        // 23505 = unique violation, meaning a code collision. Retry with a
        // fresh code; anything else is a real error.
        if (err.code !== '23505') throw err;
      }
    }
  }
}

/**
 * PRODUCTION LOG HISTORY — edits and undos.
 *
 * production_log_edit: every edit to a logged batch writes one row with
 * the batch exactly as it was before and exactly as it is after
 * (quantity, labor cost, material cost, every ingredient line). That is
 * what makes silent stock adjustment safe: any change can be traced to
 * who made it and when. Rows cascade-delete with their production_log row.
 *
 * production_log_undo: undoing a batch really removes it (so finance,
 * runway and every list stay correct without touching their queries), but
 * first saves a full snapshot of it here, including its edit history, who
 * undid it and when. No foreign key on the batch (it is gone by design) or
 * on the user (the audit must outlive any account).
 *
 * Created here rather than in schema.sql so they run after production_log
 * is guaranteed to exist and after the edited_* columns above.
 */
async function migrateProductionEdits() {
  await query(`
    CREATE TABLE IF NOT EXISTS production_log_edit (
      edit_id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      edited_by TEXT,
      edited_at TIMESTAMPTZ DEFAULT NOW(),
      before_data JSONB NOT NULL,
      after_data JSONB NOT NULL,
      FOREIGN KEY (production_id) REFERENCES production_log (production_id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      FOREIGN KEY (edited_by) REFERENCES "user" (user_id)
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_production_log_edit_production
    ON production_log_edit (production_id, edited_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS production_log_undo (
      undo_id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      undone_by TEXT,
      undone_at TIMESTAMPTZ DEFAULT NOW(),
      snapshot JSONB NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_production_log_undo_business
    ON production_log_undo (business_id, undone_at DESC);
  `);
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