const db = require('./db');
async function run() {
  const res = await db.query('SELECT * FROM public.deployments');
  console.log('Deployments:', res.rows);
  const profiles = await db.query('SELECT id, name, role FROM public.profiles');
  console.log('Profiles:', profiles.rows);
  process.exit(0);
}
run();
