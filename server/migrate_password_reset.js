const db = require('./db');

async function migrate() {
  try {
    console.log('Ensuring public.password_reset_tokens table exists...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_email ON public.password_reset_tokens(email);
    `);
    console.log('Migration successful: password_reset_tokens table is ready.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

