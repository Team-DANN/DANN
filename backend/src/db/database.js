const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../dann.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

function runMigrations(db) {
  const migrations = [
    { table: 'product', col: 'current_stock', type: 'REAL NOT NULL DEFAULT 0.0' },
    { table: 'material_restock_log', col: 'type', type: "TEXT DEFAULT 'purchase'" },
    { table: 'production_log', col: 'labor_cost', type: 'REAL DEFAULT 0.0' },
    { table: 'production_log', col: 'total_material_cost', type: 'REAL DEFAULT 0.0' },
  ];

  for (const m of migrations) {
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(${m.table});`).all();
      const hasCol = tableInfo.some(col => col.name === m.col);
      if (tableInfo.length > 0 && !hasCol) {
        db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.type};`);
      }
    } catch (e) {
      // table doesn't exist yet
    }
  }
}

function initDb() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schemaSql);
  runMigrations(db);
  console.log('[DB] Database tables initialized & migrated successfully.');
}

module.exports = {
  getDb,
  initDb,
  DB_PATH,
};
