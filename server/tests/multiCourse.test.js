// Multi-course isolation integration test (tasks 5.2-5.4). Creates temporary zz_test_* accounts, removes them after.
// Run: node server/tests/multiCourse.test.js   (needs local Postgres from server/db.js)
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const db = require('../db');

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const PW = 'TestPass123!';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); if (!ok) failed++; };

async function api(method, url, token, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const login = async (email) => (await api('POST', '/auth/login', null, { email, password: PW })).data.token;

async function mkProfile(email, name, role, course) {
  const hash = await bcrypt.hash(PW, 8);
  const r = await db.query(
    `INSERT INTO public.profiles (email, password_hash, name, role, coordinator_course) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [email, hash, name, role, course || null]);
  return r.rows[0].id;
}
async function mkStudent(tag, course) {
  const id = await mkProfile(`zz_test_${tag}@test.local`, `ZZ ${tag}`, 'student');
  await db.query(`INSERT INTO public.students (user_id, student_id, last_name, first_name, course) VALUES ($1,$2,'Test',$3,$4)`, [id, `ZZ-${tag}`, tag, course]);
  return id;
}
async function cleanup() {
  await db.query(`DELETE FROM public.profiles WHERE email LIKE 'zz_test_%'`);
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../index.js')], { env: { ...process.env, PORT }, stdio: 'ignore' });
  try {
    await cleanup();
    for (let i = 0; i < 30; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }

    const itStu = await mkStudent('bsit', 'BSIT');
    const beedStu = await mkStudent('beed', 'BEED');
    await mkProfile('zz_test_coord_bsit@test.local', 'ZZ Coord BSIT', 'coordinator', 'BSIT');
    await mkProfile('zz_test_coord_beed@test.local', 'ZZ Coord BEED', 'coordinator', 'BEED');
    await mkProfile('zz_test_super@test.local', 'ZZ Super', 'superadmin');
    await db.query(`INSERT INTO public.dtr_records (student_id, date, time_in, status) VALUES ($1, CURRENT_DATE, '08:00', 'pending'), ($2, CURRENT_DATE, '08:00', 'pending')`, [itStu, beedStu]).catch(e => console.log('note: dtr seed skipped:', e.message));

    const tIt = await login('zz_test_coord_bsit@test.local');
    const tBeed = await login('zz_test_coord_beed@test.local');
    const tSuper = await login('zz_test_super@test.local');
    const hasTest = (rows, id) => rows.some(r => r.studentId === id || r.id === id);

    // 5.2 coordinator isolation
    const sIt = (await api('GET', '/students', tIt)).data || [];
    check('5.2 BSIT coordinator sees BSIT student', hasTest(sIt, itStu));
    check('5.2 BSIT coordinator cannot see BEED student', !hasTest(sIt, beedStu));
    check('5.2 all rows for BSIT coordinator are BSIT', sIt.every(s => s.course === 'BSIT'));
    const sBeed = (await api('GET', '/students', tBeed)).data || [];
    check('5.2 BEED coordinator sees only BEED', hasTest(sBeed, beedStu) && !hasTest(sBeed, itStu));
    const dIt = (await api('GET', '/admin/dtr', tIt)).data || [];
    check('5.2 DTR scoped (no BEED student)', !hasTest(dIt, beedStu));
    const docIt = (await api('GET', '/documents', tIt)).data || [];
    check('5.2 documents scoped (no BEED student)', !hasTest(docIt, beedStu));
    const evIt = await api('GET', '/evaluations', tIt);
    check('5.2 evaluations endpoint OK for coordinator', evIt.status === 200);
    const dep = await api('PUT', `/students/${beedStu}/deploy`, tIt, { companyName: 'X', position: 'Y', startDate: '2026-01-01', endDate: '2026-06-01' });
    check('5.2 BSIT coordinator cannot deploy BEED student', dep.status === 403, `status ${dep.status}`);

    // 5.3 superadmin sees everything, read-only
    const sSuper = (await api('GET', '/students', tSuper)).data || [];
    check('5.3 superadmin sees BSIT + BEED students', hasTest(sSuper, itStu) && hasTest(sSuper, beedStu));
    const dSuper = (await api('GET', '/admin/dtr', tSuper)).data || [];
    check('5.3 superadmin DTR sees both courses', hasTest(dSuper, itStu) && hasTest(dSuper, beedStu));
    const depSuper = await api('PUT', `/students/${itStu}/deploy`, tSuper, { companyName: 'X', position: 'Y' });
    check('5.3 superadmin cannot deploy (read-only)', depSuper.status === 403, `status ${depSuper.status}`);

    // 5.4 superadmin creates coordinator
    const c1 = await api('POST', '/coordinators', tIt, { email: 'zz_test_new@test.local', password: PW, name: 'ZZ New', coordinatorCourse: 'BSBA' });
    check('5.4 coordinator cannot create coordinators', c1.status === 403, `status ${c1.status}`);
    const c2 = await api('POST', '/coordinators', tSuper, { email: 'zz_test_new@test.local', password: PW, name: 'ZZ New', coordinatorCourse: 'BSBA' });
    check('5.4 superadmin creates BSBA coordinator', c2.status < 300, JSON.stringify(c2.data));
    const bsbaStu = await mkStudent('bsba', 'BSBA');
    const tNew = await login('zz_test_new@test.local');
    check('5.4 new coordinator can log in', !!tNew);
    const sNew = (await api('GET', '/students', tNew)).data || [];
    check('5.4 new coordinator sees only BSBA', hasTest(sNew, bsbaStu) && !hasTest(sNew, itStu) && !hasTest(sNew, beedStu));
    const bad = await api('POST', '/coordinators', tSuper, { email: 'zz_test_bad@test.local', password: PW, name: 'Bad', coordinatorCourse: 'XYZ' });
    check('5.4 invalid course rejected', bad.status === 400, `status ${bad.status}`);
    const reg = await api('POST', '/auth/signup', null, { email: 'zz_test_reg@test.local', password: PW, name: 'Reg', role: 'superadmin' });
    check('5.1 self-registration as superadmin blocked', reg.status >= 400, `status ${reg.status}`);
  } catch (e) {
    console.log('ERROR', e); failed++;
  } finally {
    await cleanup().catch(() => {});
    server.kill();
    console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
    process.exit(failed ? 1 : 0);
  }
})();
