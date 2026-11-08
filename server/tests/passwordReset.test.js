const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const db = require('../db');

const PORT = 3998;
const BASE = `http://localhost:${PORT}`;
const INITIAL_PW = 'InitialPassword123!';
const NEW_PW = 'UpdatedPassword456!';
const CHANGED_PW = 'ChangedPassword789!';

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
  const hash = await bcrypt.hash(INITIAL_PW, 8);
  const r = await db.query(
    `INSERT INTO public.profiles (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
    [email, hash, name, role]
  );
  const userId = r.rows[0].id;
  if (role === 'student') {
    await db.query(
      `INSERT INTO public.students (user_id, student_id, first_name, last_name, course) VALUES ($1, 'TEST-001', 'Test', 'Student', 'BSIT')`,
      [userId]
    );
  } else if (role === 'company') {
    await db.query(
      `INSERT INTO public.companies (user_id, company_name, hr_contact, hr_email) VALUES ($1, 'Test Corp', 'HR Lead', $2)`,
      [userId, email]
    );
  }
  return userId;
}

async function cleanup() {
  await db.query(`DELETE FROM public.password_reset_tokens WHERE email LIKE 'pwd_test_%'`);
  await db.query(`DELETE FROM public.profiles WHERE email LIKE 'pwd_test_%'`);
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

    const studentEmail = 'pwd_test_student@test.local';
    const companyEmail = 'pwd_test_company@test.local';

    await mkUser(studentEmail, 'Student Test', 'student');
    await mkUser(companyEmail, 'Company Test', 'company');

    // 1. Forgot Password - non-existent email
    const nonExistent = await api('POST', '/auth/forgot-password', null, { email: 'nonexistent@test.local' });
    check('1. Forgot password returns 404 for unknown email', nonExistent.status === 404);

    // 2. Forgot Password - student
    const studentForgot = await api('POST', '/auth/forgot-password', null, { email: studentEmail });
    check('2. Forgot password succeeds for student', studentForgot.status === 200 && studentForgot.data.success);
    const sCodeRes = await db.query(`SELECT code FROM public.password_reset_tokens WHERE email = $1 ORDER BY created_at DESC LIMIT 1`, [studentEmail]);
    const studentCode = sCodeRes.rows[0]?.code;
    check('2. Reset code found in database', !!studentCode);

    // 3. Reset Password - wrong code
    const wrongCodeRes = await api('POST', '/auth/reset-password', null, {
      email: studentEmail,
      code: '999999',
      newPassword: NEW_PW
    });
    check('3. Reset password fails with wrong code', wrongCodeRes.status === 400);

    // 4. Reset Password - too short password
    const shortPwRes = await api('POST', '/auth/reset-password', null, {
      email: studentEmail,
      code: studentCode,
      newPassword: '123'
    });
    check('4. Reset password rejects short password', shortPwRes.status === 400);

    // 5. Reset Password - correct code
    const resetSuccess = await api('POST', '/auth/reset-password', null, {
      email: studentEmail,
      code: studentCode,
      newPassword: NEW_PW
    });
    check('5. Reset password succeeds with correct code', resetSuccess.status === 200 && resetSuccess.data.success);

    // 6. Login with old password fails
    const oldLogin = await api('POST', '/auth/login', null, { email: studentEmail, password: INITIAL_PW });
    check('6. Old password no longer works', oldLogin.status === 401);

    // 7. Login with new password succeeds
    const newLogin = await api('POST', '/auth/login', null, { email: studentEmail, password: NEW_PW });
    check('7. Login with new password succeeds', newLogin.status === 200 && !!newLogin.data.token);
    const studentToken = newLogin.data.token;

    // 8. Re-use same code fails
    const reuseCode = await api('POST', '/auth/reset-password', null, {
      email: studentEmail,
      code: studentCode,
      newPassword: 'AnotherPassword123!'
    });
    check('8. Used code cannot be reused', reuseCode.status === 400);

    // 9. Forgot Password - company
    const companyForgot = await api('POST', '/auth/forgot-password', null, { email: companyEmail });
    check('9. Forgot password succeeds for company', companyForgot.status === 200 && companyForgot.data.success);
    const cCodeRes = await db.query(`SELECT code FROM public.password_reset_tokens WHERE email = $1 ORDER BY created_at DESC LIMIT 1`, [companyEmail]);
    const companyCode = cCodeRes.rows[0]?.code;
    check('9. Company code found in database', !!companyCode);

    // 10. Reset Password - company
    const companyReset = await api('POST', '/auth/reset-password', null, {
      email: companyEmail,
      code: companyCode,
      newPassword: NEW_PW
    });
    check('10. Reset password succeeds for company', companyReset.status === 200 && companyReset.data.success);

    // 11. Change Password - wrong current password
    const wrongCurrent = await api('POST', '/auth/change-password', studentToken, {
      currentPassword: 'WrongCurrentPassword!',
      newPassword: CHANGED_PW
    });
    check('11. Change password fails with wrong current password', wrongCurrent.status === 400);

    // 12. Change Password - same as current password
    const samePw = await api('POST', '/auth/change-password', studentToken, {
      currentPassword: NEW_PW,
      newPassword: NEW_PW
    });
    check('12. Change password rejects identical new password', samePw.status === 400);

    // 13. Change Password - success
    const changeSuccess = await api('POST', '/auth/change-password', studentToken, {
      currentPassword: NEW_PW,
      newPassword: CHANGED_PW
    });
    check('13. Change password succeeds with valid current password', changeSuccess.status === 200 && changeSuccess.data.success);

    // 14. Login with changed password
    const changedLogin = await api('POST', '/auth/login', null, { email: studentEmail, password: CHANGED_PW });
    check('14. Login succeeds with changed password', changedLogin.status === 200 && !!changedLogin.data.token);

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

