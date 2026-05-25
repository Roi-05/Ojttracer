const db = require('./db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE public.students 
      ADD COLUMN IF NOT EXISTS father_name text DEFAULT '',
      ADD COLUMN IF NOT EXISTS father_occupation text DEFAULT '',
      ADD COLUMN IF NOT EXISTS father_phone text DEFAULT '',
      ADD COLUMN IF NOT EXISTS mother_name text DEFAULT '',
      ADD COLUMN IF NOT EXISTS mother_occupation text DEFAULT '',
      ADD COLUMN IF NOT EXISTS mother_phone text DEFAULT '',
      ADD COLUMN IF NOT EXISTS guardian_name text DEFAULT '',
      ADD COLUMN IF NOT EXISTS guardian_relationship text DEFAULT '',
      ADD COLUMN IF NOT EXISTS guardian_phone text DEFAULT ''
    `);
    console.log('✓ Parent and guardian columns ensured on public.students table');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
