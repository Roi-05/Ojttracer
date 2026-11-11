const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const db = require('../db');

const PORT = 3997;
const BASE = `http://localhost:${PORT}`;
const PW = 'TestPassword123!';

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  if (!ok) failed++;
};

async function api(method, url, token, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function mkUser(email, name, role) {
  const hash = await bcrypt.hash(PW, 8);
  const r = await db.query(
    `INSERT INTO public.profiles (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
    [email, hash, name, role]
  );
  return r.rows[0].id;
}

async function cleanup() {
  await db.query(`DELETE FROM public.deployments WHERE company_name LIKE 'geo_test_%'`);
  await db.query(`DELETE FROM public.companies WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'geo_test_%')`);
  await db.query(`DELETE FROM public.students WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'geo_test_%')`);
  await db.query(`DELETE FROM public.profiles WHERE email LIKE 'geo_test_%'`);
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../index.js')], {
    env: { ...process.env, PORT },
    stdio: 'ignore'
  });

  try {
    await cleanup();
    for (let i = 0; i < 30; i++) {
      try {
        if ((await fetch(BASE + '/health')).ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }

    const studentEmail = 'geo_test_student@test.local';
    const companyEmail = 'geo_test_company@test.local';

    const studentId = await mkUser(studentEmail, 'Geo Student', 'student');
    await db.query(
      `INSERT INTO public.students (user_id, student_id, first_name, last_name, course) VALUES ($1, 'GEO-001', 'Geo', 'Student', 'BSIT')`,
      [studentId]
    );

    const companyId = await mkUser(companyEmail, 'Geo Company', 'company');
    const testPolygon = [
      [15.0800, 120.6200],
      [15.0800, 120.6250],
      [15.0750, 120.6250],
      [15.0750, 120.6200]
    ];
    await db.query(
      `INSERT INTO public.companies (user_id, company_name, hr_contact, hr_email, latitude, longitude, geofence_radius, geofence_polygon)
       VALUES ($1, 'geo_test_corp', 'HR Lead', $2, 15.0775, 120.6225, 200, $3)`,
      [companyId, companyEmail, JSON.stringify(testPolygon)]
    );

    // Deploy student to company
    await db.query(
      `INSERT INTO public.deployments (student_id, company_id, company_name, position, start_date, end_date, required_hours, status)
       VALUES ($1, $2, 'geo_test_corp', 'Intern', '2026-01-01', '2026-06-01', 486, 'ongoing')`,
      [studentId, companyId]
    );

    // Login as student
    const sLogin = await api('POST', '/auth/login', null, { email: studentEmail, password: PW });
    check('1. Student login succeeds', sLogin.status === 200 && !!sLogin.data.token);
    const studentToken = sLogin.data.token;

    // Fetch deployment as student
    const depRes = await api('GET', '/deployment', studentToken);
    check('2. Student fetches deployment', depRes.status === 200 && !!depRes.data);
    check('2. geofencePolygon is returned to student', Array.isArray(depRes.data?.geofencePolygon));
    check('2. geofencePolygon matches configured points', depRes.data?.geofencePolygon?.length === 4);
    check('2. geofencePolygon vertices match', depRes.data?.geofencePolygon?.[0]?.[0] === 15.08);

    // Update company location with 5-point polygon via company endpoint
    const cLogin = await api('POST', '/auth/login', null, { email: companyEmail, password: PW });
    const companyToken = cLogin.data.token;
    const newPolygon = [
      [15.0810, 120.6200],
      [15.0810, 120.6260],
      [15.0760, 120.6260],
      [15.0750, 120.6230],
      [15.0760, 120.6200]
    ];
    const updateRes = await api('PUT', `/companies/${companyId}/location`, companyToken, {
      latitude: 15.0780,
      longitude: 120.6230,
      geofenceRadius: 300,
      geofencePolygon: newPolygon
    });
    check('3. Company updates location & polygon', updateRes.status === 200 && updateRes.data?.success);

    // Verify student sees updated polygon
    const depRes2 = await api('GET', '/deployment', studentToken);
    check('4. Student sees updated 5-point polygon', depRes2.data?.geofencePolygon?.length === 5);

  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  } finally {
    await cleanup().catch(() => {});
    server.kill();
    console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
    process.exit(failed ? 1 : 0);
  }
})();

