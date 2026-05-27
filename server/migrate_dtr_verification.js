const db = require('./db');

async function migrate() {
  try {
    // Add status column to public.dtr_records if not exists
    const statusCol = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'dtr_records' 
        AND column_name = 'status'
    `);
    if (statusCol.rows.length === 0) {
      await db.query(`ALTER TABLE public.dtr_records ADD COLUMN status text DEFAULT 'pending'`);
      console.log('✓ Added status column to public.dtr_records');
    } else {
      console.log('✓ status column already exists');
    }

    // Add review_note column to public.dtr_records if not exists
    const noteCol = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'dtr_records' 
        AND column_name = 'review_note'
    `);
    if (noteCol.rows.length === 0) {
      await db.query(`ALTER TABLE public.dtr_records ADD COLUMN review_note text DEFAULT ''`);
      console.log('✓ Added review_note column to public.dtr_records');
    } else {
      console.log('✓ review_note column already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
