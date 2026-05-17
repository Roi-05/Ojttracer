// Run once to add the signed_moa_url column if it doesn't exist
const db = require('./db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS signed_moa_url TEXT`);
    console.log('✓ signed_moa_url column ensured');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
