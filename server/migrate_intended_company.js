const db = require('./db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE public.students ADD COLUMN IF NOT EXISTS intended_company_id UUID REFERENCES public.companies(user_id)`);
    console.log('✓ intended_company_id column ensured');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
