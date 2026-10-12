const db = require('./db');

async function migrate() {
  try {
    console.log('Adding signature_url column to public.students table...');
    await db.query(`
      ALTER TABLE public.students 
      ADD COLUMN IF NOT EXISTS signature_url TEXT DEFAULT NULL;
    `);
    console.log('Migration successful: signature_url added.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
