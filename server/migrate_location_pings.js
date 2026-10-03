/**
 * migrate_location_pings.js
 * Run once to create the location_pings table for the Live Map Tracker.
 * Usage: node migrate_location_pings.js
 */
const db = require('./db');

async function migrate() {
  console.log('Running location_pings migration...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.location_pings (
      id          bigserial primary key,
      student_id  uuid not null references public.profiles(id) on delete cascade,
      latitude    numeric(10, 7) not null,
      longitude   numeric(10, 7) not null,
      accuracy    int,
      pinged_at   timestamptz not null default now()
    );
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_location_pings_student_pinged
      ON public.location_pings(student_id, pinged_at DESC);
  `);
  console.log('✅ Done. Table created: location_pings');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
