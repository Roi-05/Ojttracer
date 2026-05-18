const db = require('./db');
async function run() {
  const res = await db.query('SELECT date FROM public.accomplishments');
  console.log('Dates:', res.rows);
  process.exit(0);
}
run();
