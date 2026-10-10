/**
 * AGENT ACTION LOG.
 *
 * One row per action the DANN assistant is asked to perform. The row is
 * reserved BEFORE the action runs (status 'pending'), then completed with
 * 'executed' or 'failed'. action_id is the primary key and doubles as the
 * single-use confirmation nonce, so confirming the same action twice can
 * never run it twice, even after a restart of the assistant service.
 *
 * No foreign key on the user: the audit must outlive any account (same
 * reasoning as production_log_undo). Takes `query` as a parameter so this
 * file never has to require db/database.js (which would be circular).
 */
async function migrateAgentActions(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS agent_action_log (
      action_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      args JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'executed', 'failed')),
      result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_agent_action_log_business
    ON agent_action_log (business_id, created_at DESC);
  `);
}

module.exports = { migrateAgentActions };