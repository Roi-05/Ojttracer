const db = require('./db');

async function migrate() {
  try {
    console.log('Starting device binding migration...');

    // 1. registered_device_token
    const tokenCol = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'registered_device_token'
    `);
    if (tokenCol.rows.length === 0) {
      await db.query(`ALTER TABLE public.students ADD COLUMN registered_device_token text DEFAULT NULL`);
      console.log('✓ Added registered_device_token column to public.students');
    } else {
      console.log('✓ registered_device_token column already exists');
    }

    // 2. registered_device_name
    const nameCol = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'registered_device_name'
    `);
    if (nameCol.rows.length === 0) {
      await db.query(`ALTER TABLE public.students ADD COLUMN registered_device_name text DEFAULT NULL`);
      console.log('✓ Added registered_device_name column to public.students');
    } else {
      console.log('✓ registered_device_name column already exists');
    }

    // 3. device_registered_at
    const atCol = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'device_registered_at'
    `);
    if (atCol.rows.length === 0) {
      await db.query(`ALTER TABLE public.students ADD COLUMN device_registered_at timestamptz DEFAULT NULL`);
      console.log('✓ Added device_registered_at column to public.students');
    } else {
      console.log('✓ device_registered_at column already exists');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
