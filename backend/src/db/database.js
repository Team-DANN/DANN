const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// node-postgres returns NUMERIC/DECIMAL as strings by default (to avoid silent
// float precision loss on values it can't infer a safe JS representation for).
// This app does plain JS arithmetic on prices/costs/quantities throughout the
// services layer, so we opt in to parsing them as numbers here, once, globally,
// rather than requiring parseFloat() at every call site.
// OID 1700 = numeric, OID 20 = int8/bigint (COUNT(*) results).
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
      // Supabase's pooled/direct connections both require SSL. Supabase uses a
      // trusted cert, but rejectUnauthorized:false is the common pattern here
      // because the intermediate chain isn't always bundled in Node's default
      // CA store. Fine for this use case; revisit if you need stricter TLS.
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      // Handles errors on idle clients in the pool (e.g. connection dropped by
      // Supabase) so they don't crash the whole process.
      console.error('[DB] Unexpected error on idle client:', err);
    });
  }
  return pool;
}

/**
 * Run a single query against the pool. Use this for all non-transactional reads/writes.
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(sql, params = []) {
  return getPool().query(sql, params);
}

/**
 * Check out a dedicated client for multi-statement transactions (BEGIN/COMMIT/ROLLBACK).
 * Caller is responsible for calling client.release() when done — always in a finally block.
 *
 * Example:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query(...);
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getClient() {
  return getPool().connect();
}

/**
 * Applies schema.sql (idempotent — uses IF NOT EXISTS) and then runs any
 * incremental column migrations for schema drift on existing tables.
 */
async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await query(schemaSql);
  await runMigrations();
  console.log('[DB] Database tables initialized & migrated successfully (Supabase/PostgreSQL).');
}

/**
 * Adds columns that may be missing on existing deployments, mirroring the
 * ALTER TABLE ... ADD COLUMN pattern from the old SQLite version, but checked
 * against information_schema instead of PRAGMA table_info.
 */
async function runMigrations() {
  const migrations = [
    { table: 'product', col: 'current_stock', ddl: 'NUMERIC(12,4) NOT NULL DEFAULT 0.0' },
    { table: 'material_restock_log', col: 'type', ddl: "TEXT DEFAULT 'purchase'" },
    { table: 'production_log', col: 'labor_cost', ddl: 'NUMERIC(12,4) DEFAULT 0.0' },
    { table: 'production_log', col: 'total_material_cost', ddl: 'NUMERIC(12,4) DEFAULT 0.0' },
  ];

  for (const m of migrations) {
    const { rows } = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [m.table, m.col]
    );
    if (rows.length === 0) {
      // table_name is from our own fixed list above, never user input — safe to interpolate.
      await query(`ALTER TABLE "${m.table}" ADD COLUMN IF NOT EXISTS ${m.col} ${m.ddl};`);
    }
  }
}

/**
 * Closes the pool. Call on graceful shutdown (SIGTERM) and in test teardown.
 */
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