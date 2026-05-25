const db = require('./db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE public.students ADD COLUMN IF NOT EXISTS intended_position text DEFAULT ''`);
    console.log('✓ intended_position column ensured');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
