/**
 * migrate_geolocation.js
 * Run once to add GPS columns to the companies table.
 * Usage: node migrate_geolocation.js
 */
const db = require('./db');

async function migrate() {
  console.log('Running geolocation migration...');
  await db.query(`
    ALTER TABLE public.companies
      ADD COLUMN IF NOT EXISTS latitude        numeric(10, 7),
      ADD COLUMN IF NOT EXISTS longitude       numeric(10, 7),
      ADD COLUMN IF NOT EXISTS geofence_radius int NOT NULL DEFAULT 200;
  `);
  console.log('✅ Done. Columns added: latitude, longitude, geofence_radius');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
