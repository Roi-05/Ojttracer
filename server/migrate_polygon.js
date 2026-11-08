/**
 * migrate_polygon.js
 * Adds geofence_polygon JSONB column to the companies table.
 * Usage: node server/migrate_polygon.js
 */
const db = require('./db');

async function migrate() {
  console.log('Running geofence polygon migration...');
  await db.query(`
    ALTER TABLE public.companies
      ADD COLUMN IF NOT EXISTS geofence_polygon jsonb DEFAULT NULL;
  `);
  console.log('✅ Done. Column added: geofence_polygon (jsonb)');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
