//Alert model
const { query } = require('../db/database');

class AlertModel {
  // ACTIVE alerts only (resolved = false). This is the actual fix for the
  // "alerts list keeps growing forever" bug — the previous version had no
  // filter at all and returned every alert row ever created. This is what
  // both the Alerts page listing and Home's "N active" count should read.
  // `read` does NOT filter this list — it only affects how a row is
  // displayed (e.g. bold vs not), never whether it shows up at all.
  static async getAll(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT
        alert_id AS id,
        alert_id,
        business_id,
        type,
        severity,
        related_entity_id,
        message,
        created_at,
        updated_at,
        read,
        resolved
      FROM alert
      WHERE business_id = $1 AND resolved = false
      ORDER BY
        CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        created_at DESC`,
      [businessId]
    );
    return rows;
  }

  // Active AND not yet seen — this drives the bell badge. A resolved
  // alert never counts here even if it was never explicitly marked read;
  // there's nothing left to act on once the real problem is gone.
  static async getUnreadCount(businessId = 'biz_default') {
    const { rows } = await query(
      `SELECT COUNT(*) AS count
      FROM alert
      WHERE business_id = $1 AND read = false AND resolved = false`,
      [businessId]
    );
    return rows[0] ? parseInt(rows[0].count, 10) : 0;
  }

  // Active alerts of one type — used by the sync functions to compare
  // "what's currently marked active in the DB" against "what's actually
  // at-risk right now", so anything no longer at-risk can be resolved.
  static async getActiveByType(businessId, type) {
    const { rows } = await query(
      `SELECT alert_id AS id, related_entity_id
      FROM alert
      WHERE business_id = $1 AND type = $2 AND resolved = false`,
      [businessId, type]
    );
    return rows;
  }

  /**
   * Upsert keyed on the DB's partial unique index
   * idx_alert_active_unique: (business_id, type, related_entity_id)
   * WHERE resolved = false.
   *
   * This is the actual fix for alerts duplicating on every refresh: the
   * old dedupe check asked "does an unread alert already exist?" — but
   * viewing the Alerts page sets EVERY alert to read = true regardless of
   * whether the real problem is still happening, so the next sync pass
   * always found zero unread rows and inserted a fresh duplicate.
   * `resolved` is now the only thing that means "is this still active",
   * and it is NEVER touched by read/markAsRead — only by the sync
   * functions in alertService.js, only when the real underlying number
   * changes.
   *
   * On conflict (an active alert already exists for this exact type +
   * entity), this UPDATEs that row's message/severity in place instead of
   * inserting a second one. Deliberately does NOT reset `read` on that
   * update path — if the user already saw "butter low" and it's still
   * low next sync, we don't want to silently re-flip it to unread and
   * re-notify them for a problem they've already acknowledged. A truly
   * NEW issue (first insert for that entity) starts unread, which is
   * correct — that's exactly when re-surfacing it matters.
   */
  static async upsertActive(alertData) {
    const {
      alert_id,
      business_id = 'biz_default',
      type,
      severity = 'info',
      related_entity_id = null,
      message,
    } = alertData;

    const { rows } = await query(
      `INSERT INTO alert (alert_id, business_id, type, severity, related_entity_id, message, read, resolved, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, false, NOW())
      ON CONFLICT (business_id, type, related_entity_id) WHERE resolved = false
      DO UPDATE SET
        message = EXCLUDED.message,
        severity = EXCLUDED.severity,
        updated_at = NOW()
      RETURNING alert_id AS id, *`,
      [alert_id, business_id, type, severity, related_entity_id, message]
    );
    return rows[0];
  }

  // The ONLY correct way to say "this problem went away" — flips
  // resolved, leaves read exactly as it was. Called exclusively from the
  // sync functions in alertService.js when the real condition clears
  // (restocked, burn rate slowed, invoice paid).
  static async resolveByEntity(businessId, type, relatedEntityId) {
    await query(
      `UPDATE alert
      SET resolved = true, updated_at = NOW()
      WHERE business_id = $1 AND type = $2 AND related_entity_id = $3 AND resolved = false`,
      [businessId, type, relatedEntityId]
    );
  }

  // "I've seen this" — purely cosmetic (bell badge, bold styling in the
  // UI). Never removes an alert from the active list and never affects
  // dedupe — this is what actually fixes the bug: visiting /alerts can no
  // longer resurrect duplicates, because create/dedupe logic no longer
  // looks at `read` at all.
  static async markAsRead(alertId, businessId = 'biz_default') {
    const { rows } = await query(
      `UPDATE alert
      SET read = true
      WHERE alert_id = $1 AND business_id = $2
      RETURNING alert_id AS id, *`,
      [alertId, businessId]
    );
    return rows[0];
  }
}

module.exports = AlertModel;