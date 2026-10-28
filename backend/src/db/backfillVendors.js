/**
 * One-off backfill: turn the free-text material.supplier_name values into
 * vendor records and link each material to its vendor (material.vendor_id).
 *
 * Usage (run from the backend/ folder, after the B2B migration has run):
 *   node db/backfillVendors.js            dry run: shows the plan, writes nothing
 *   node db/backfillVendors.js --apply    does it
 *
 * How it works:
 *  - Only materials with a supplier_name and no vendor_id yet are touched,
 *    so it is safe to run twice.
 *  - Names are grouped per business, ignoring case and surrounding spaces
 *    ("Amul", "amul " and "AMUL" become one vendor). The most common
 *    spelling wins.
 *  - If the business already has an active vendor with that name, it is
 *    reused instead of creating a duplicate.
 *  - supplier_name itself is NOT changed.
 *  - The dry run does exactly the same work inside a transaction and then
 *    rolls it back, so what it reports is what --apply will do.
 */
const crypto = require('crypto');
const { getClient, closeDb } = require('./database');

function newVendorId() {
  return `ven_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

async function backfillVendorsFromSuppliers({ apply = false } = {}) {
  const client = await getClient();
  const plan = [];
  let vendorsCreated = 0;
  let vendorsReused = 0;
  let materialsLinked = 0;

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT material_id, business_id, TRIM(supplier_name) AS supplier_name
       FROM material
       WHERE vendor_id IS NULL
         AND supplier_name IS NOT NULL
         AND TRIM(supplier_name) <> ''
       ORDER BY business_id, material_id`
    );

    // Group by business + lower-cased name.
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.business_id}\u0000${row.supplier_name.toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          business_id: row.business_id,
          lowerName: row.supplier_name.toLowerCase(),
          spellings: new Map(),
          material_ids: [],
        });
      }
      const group = groups.get(key);
      group.spellings.set(row.supplier_name, (group.spellings.get(row.supplier_name) || 0) + 1);
      group.material_ids.push(row.material_id);
    }

    for (const group of groups.values()) {
      // Most common spelling; ties keep the first one seen.
      let displayName = null;
      let best = 0;
      for (const [spelling, count] of group.spellings) {
        if (count > best) {
          best = count;
          displayName = spelling;
        }
      }

      const { rows: existing } = await client.query(
        `SELECT vendor_id FROM vendor
         WHERE business_id = $1 AND LOWER(name) = $2 AND active = TRUE`,
        [group.business_id, group.lowerName]
      );

      let vendorId;
      let action;
      if (existing.length > 0) {
        vendorId = existing[0].vendor_id;
        action = 'reuse';
        vendorsReused += 1;
      } else {
        vendorId = newVendorId();
        action = 'create';
        await client.query(
          `INSERT INTO vendor (vendor_id, business_id, name) VALUES ($1, $2, $3)`,
          [vendorId, group.business_id, displayName]
        );
        vendorsCreated += 1;
      }

      const { rowCount } = await client.query(
        `UPDATE material SET vendor_id = $1
         WHERE business_id = $2 AND material_id = ANY($3::text[]) AND vendor_id IS NULL`,
        [vendorId, group.business_id, group.material_ids]
      );
      materialsLinked += rowCount;

      plan.push({
        business_id: group.business_id,
        vendor_name: displayName,
        action,
        materials: rowCount,
      });
    }

    if (apply) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { applied: apply, plan, vendorsCreated, vendorsReused, materialsLinked };
}

module.exports = { backfillVendorsFromSuppliers };

if (require.main === module) {
  const apply = process.argv.includes('--apply');

  backfillVendorsFromSuppliers({ apply })
    .then((summary) => {
      console.log(apply ? '\nAPPLIED' : '\nDRY RUN (rolled back, nothing was written)');
      for (const p of summary.plan) {
        console.log(`  [${p.business_id}] "${p.vendor_name}" -> ${p.action} vendor, ${p.materials} material(s)`);
      }
      console.log(
        `\n${summary.vendorsCreated} vendor(s) created, ${summary.vendorsReused} reused, ` +
        `${summary.materialsLinked} material(s) linked.`
      );
      if (!apply) console.log('Run again with --apply to write these changes.');
    })
    .catch((err) => {
      console.error('Backfill failed, nothing was written:', err.message);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}