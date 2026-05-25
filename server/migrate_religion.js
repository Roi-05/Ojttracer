const db = require('./db');

async function migrate() {
  try {
    const checkRes = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'religion'
    `);
    
    if (checkRes.rows.length === 0) {
      const ecRes = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'emergency_contact'
      `);
      if (ecRes.rows.length > 0) {
        await db.query(`ALTER TABLE public.students RENAME COLUMN emergency_contact TO religion`);
        console.log('✓ Renamed emergency_contact column to religion');
      } else {
        await db.query(`ALTER TABLE public.students ADD COLUMN religion text DEFAULT ''`);
        console.log('✓ Added religion column');
      }
    } else {
      console.log('✓ religion column already exists');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
