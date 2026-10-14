/**
 * migrate_company_signature.js
 *
 * Usage: node migrate_company_signature.js
 */
const db = require('./db');

async function migrate() {
  try {
    console.log('Adding signature_url column to public.companies table...');
    await db.query(`
      ALTER TABLE public.companies
      ADD COLUMN IF NOT EXISTS signature_url TEXT DEFAULT NULL;
    `);
    console.log('Migration successful: companies.signature_url added.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
