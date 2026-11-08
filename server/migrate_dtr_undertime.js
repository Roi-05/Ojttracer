/**
 * migrate_dtr_undertime.js
 * Updates existing completed DTR records:
 * - If hours < 8 -> 'Undertime'
 * - If hours >= 8 -> 'Completed'
 * Usage: node server/migrate_dtr_undertime.js
 */
const db = require('./db');

async function migrate() {
  console.log('Running DTR undertime/completed remarks migration...');
  const res = await db.query(`
    UPDATE public.dtr_records
    SET remarks = CASE
      WHEN hours < 8 THEN 'Undertime'
      ELSE 'Completed'
    END
    WHERE time_out IS NOT NULL AND time_out != '';
  `);
  console.log(`✅ Done. Updated ${res.rowCount || 0} DTR records to 'Undertime' or 'Completed'.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
