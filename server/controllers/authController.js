const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { generateToken } = require('../auth');
const { normalizeUploadUrl } = require('../utils/uploadUrl');
const { sendPasswordResetEmail } = require('../utils/email');

async function loadProfile(userId) {
  const baseRes = await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [userId]);
  const base = baseRes.rows[0];
  if (!base) return null;

  const out = { id: base.id, email: base.email, name: base.name, role: base.role, avatarUrl: normalizeUploadUrl(base.avatar_url), createdAt: base.created_at, coordinatorCourse: base.coordinator_course || null };

  if (base.role === 'student') {
    const sRes = await db.query(`SELECT * FROM public.students WHERE user_id = $1`, [userId]);
    const s = sRes.rows[0];
    if (s) Object.assign(out, {
      studentId: s.student_id,
      lastName: s.last_name || '',
      firstName: s.first_name || '',
      middleName: s.middle_name || '',
      section: s.section,
      course: s.course || 'BSIT',
      yearLevel: s.year_level || '4th Year',
      schoolYear: s.school_year || '2025-2026',
      dateOfBirth: s.date_of_birth || null,
      civilStatus: s.civil_status || '',
      sex: s.sex || '',
      phone: s.phone,
      address: s.address,
      skills: s.skills,
      religion: s.religion || '',
      intendedCompanyId: s.intended_company_id,
      intendedPosition: s.intended_position || '',
      fatherName: s.father_name || '',
      fatherOccupation: s.father_occupation || '',
      fatherPhone: s.father_phone || '',
      motherName: s.mother_name || '',
      motherOccupation: s.mother_occupation || '',
      motherPhone: s.mother_phone || '',
      guardianName: s.guardian_name || '',
      guardianRelationship: s.guardian_relationship || '',
      guardianPhone: s.guardian_phone || '',
      signatureUrl: normalizeUploadUrl(s.signature_url)
    });
  } else if (base.role === 'company') {
    const cRes = await db.query(`SELECT * FROM public.companies WHERE user_id = $1`, [userId]);
    const cmp = cRes.rows[0];
    if (cmp) Object.assign(out, {
      companyName: cmp.company_name,
      industry: cmp.industry,
      companyAddress: cmp.company_address,
      website: cmp.website,
      hrContact: cmp.hr_contact,
      hrEmail: cmp.hr_email,
      phone: cmp.phone,
      description: cmp.description,
      moaStatus: cmp.moa_status,
      accreditedUntil: cmp.accredited_until,
      latitude: cmp.latitude != null ? parseFloat(cmp.latitude) : null,
      longitude: cmp.longitude != null ? parseFloat(cmp.longitude) : null,
      geofenceRadius: cmp.geofence_radius || 200,
      geofencePolygon: Array.isArray(cmp.geofence_polygon)
        ? cmp.geofence_polygon
        : (typeof cmp.geofence_polygon === 'string'
            ? (() => { try { return JSON.parse(cmp.geofence_polygon); } catch (_) { return null; } })()
            : null),
      signatureUrl: normalizeUploadUrl(cmp.signature_url),
      breakStart: cmp.break_start || null,
      breakEnd: cmp.break_end || null,
    });
  }
  return out;
}

const COURSE_COMPANY_EMAILS = {
  BSIT: 'itcompany@gmail.com',
  BEED: 'edcompany@gmail.com',
  BSBA: 'bacompany@gmail.com',
  BSSW: 'swcompany@gmail.com',
};

const DEFAULT_POSITIONS = {
  BSIT: 'IT Intern',
  BEED: 'Student Teacher Intern',
  BSBA: 'Business Administration Intern',
  BSSW: 'Social Work Intern',
};

const REQUIRED_DOC_NAMES = [
  'Parent Guardian Consent Form',
  'Certificate of Enrollment',
  'Certification Form',
  'Internship Endorsement Form',
  '1st Endorsement Form',
  'Internship Agreement Form',
  'Memorandum of Agreement',
];

const signup = async (req, res) => {
  try {
    const { email, password, name, role, studentId, section, course, companyName, industry } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });

    // Prevent coordinator/superadmin self-registration
    if (role === 'coordinator' || role === 'superadmin' || role === 'admin') {
      return res.status(403).json({
        error: 'This account type cannot self-register. Contact your system administrator.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await db.query(`SELECT id FROM public.profiles WHERE LOWER(email) = $1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO public.profiles (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [cleanEmail, password_hash, name.trim(), role]
    );
    const userId = result.rows[0].id;

    if (role === 'student') {
      const normalizedCourse = ['BSIT', 'BEED', 'BSBA', 'BSSW'].includes(String(course || '').toUpperCase())
        ? String(course).toUpperCase()
        : 'BSIT';
      const cleanSection = String(section || '4A').trim() || '4A';

      // Split full name into first_name and last_name for coordinator directory & reports
      const nameParts = String(name || '').trim().split(/\s+/);
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] || '');
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // Lookup the partner company for the student's course
      const targetCompanyEmail = COURSE_COMPANY_EMAILS[normalizedCourse] || 'itcompany@gmail.com';
      const defaultPosition = DEFAULT_POSITIONS[normalizedCourse] || 'OJT Intern';

      const compRes = await db.query(
        `SELECT p.id, p.name, p.email, c.company_name, c.company_address, c.hr_contact, c.hr_email, c.moa_status
         FROM public.profiles p
         LEFT JOIN public.companies c ON c.user_id = p.id
         WHERE LOWER(p.email) = LOWER($1)
         LIMIT 1`,
        [targetCompanyEmail]
      );
      const comp = compRes.rows[0] || null;

      if (comp && comp.moa_status !== 'active') {
        await db.query(`UPDATE public.companies SET moa_status = 'active' WHERE user_id = $1`, [comp.id]);
      }

      // 1. Insert student record assigned to their course (which links them to the course's Coordinator)
      await db.query(
        `INSERT INTO public.students
          (user_id, student_id, first_name, last_name, section, course, year_level, school_year, intended_company_id, intended_position)
         VALUES ($1, $2, $3, $4, $5, $6, '4th Year', '2025-2026', $7, $8)`,
        [
          userId,
          String(studentId || '').trim(),
          firstName,
          lastName,
          cleanSection,
          normalizedCourse,
          comp ? comp.id : null,
          defaultPosition,
        ]
      );

      // 2. Auto-approve all 7 required documents so student skips manual upload
      const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      for (const docName of REQUIRED_DOC_NAMES) {
        await db.query(
          `INSERT INTO public.documents (student_id, name, status, uploaded_date)
           VALUES ($1, $2, 'approved', $3)
           ON CONFLICT (student_id, name) DO UPDATE SET status = 'approved', uploaded_date = $3`,
          [userId, docName, todayLabel]
        );
      }

      // 3. Auto-deploy the student to their course's partner company
      const startDate = new Date().toISOString().slice(0, 10);
      const endObj = new Date();
      endObj.setMonth(endObj.getMonth() + 4);
      const endDate = endObj.toISOString().slice(0, 10);

      await db.query(
        `INSERT INTO public.deployments
          (student_id, company_id, company_name, position, start_date, end_date, required_hours, supervisor, supervisor_email, address, status)
         VALUES ($1, $2, $3, $4, $5, $6, 486, $7, $8, $9, 'ongoing')
         ON CONFLICT (student_id) DO UPDATE SET
          company_id = $2, company_name = $3, position = $4, status = 'ongoing'`,
        [
          userId,
          comp ? comp.id : null,
          comp?.company_name || comp?.name || `${normalizedCourse} Partner Company`,
          defaultPosition,
          startDate,
          endDate,
          comp?.hr_contact || comp?.name || 'Company Supervisor',
          comp?.hr_email || comp?.email || targetCompanyEmail,
          comp?.company_address || 'Pampanga',
        ]
      );
    } else if (role === 'company') {
      await db.query(
        `INSERT INTO public.companies (user_id, company_name, industry, hr_contact, hr_email) VALUES ($1, $2, $3, $4, $5)`,
        [userId, companyName || name, industry || '', name, cleanEmail]
      );
    }

    const token = generateToken({ id: userId, email: cleanEmail, role });
    res.json({ success: true, userId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await db.query(`SELECT * FROM public.profiles WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid login credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid login credentials' });

    const token = generateToken(user, !!rememberMe);
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const me = async (req, res) => {
  try {
    const profile = await loadProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

let tableEnsured = false;
async function ensurePasswordResetTable() {
  if (tableEnsured) return;
  try {
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
    tableEnsured = true;
  } catch (err) {
    console.warn('[DB] password_reset_tokens table check:', err.message);
  }
}
ensurePasswordResetTable().catch(() => {});

const forgotPassword = async (req, res) => {
  try {
    await ensurePasswordResetTable();
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if account exists
    const userRes = await db.query(
      `SELECT id, email, name, role FROM public.profiles WHERE LOWER(email) = $1`,
      [cleanEmail]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'No account registered with this email address. Please verify your email or contact your coordinator.'
      });
    }

    // Generate 6-digit verification code and token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate prior unused codes for this email
    await db.query(
      `UPDATE public.password_reset_tokens SET used = true WHERE LOWER(email) = $1 AND used = false`,
      [cleanEmail]
    );

    // Save token
    await db.query(
      `INSERT INTO public.password_reset_tokens (email, code, token, expires_at) VALUES ($1, $2, $3, $4)`,
      [cleanEmail, code, token, expiresAt]
    );

    // Attempt to send email
    let emailSent = false;
    try {
      emailSent = await sendPasswordResetEmail(cleanEmail, user.name, code);
    } catch (mailErr) {
      console.error('[ForgotPassword] Failed to send email via SMTP:', mailErr.message);
    }

    const responsePayload = {
      success: true,
      message: emailSent
        ? `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox and spam folder.`
        : `A 6-digit verification code has been generated. Please check your email.`,
    };

    console.log(`[ForgotPassword] Verification code for ${cleanEmail}: ${code} (emailSent: ${emailSent})`);

    res.json(responsePayload);
  } catch (err) {
    console.error('[ForgotPassword] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process password reset request.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    await ensurePasswordResetTable();
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    // Check valid token
    const tokenRes = await db.query(
      `SELECT * FROM public.password_reset_tokens
       WHERE LOWER(email) = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, cleanCode]
    );

    const record = tokenRes.rows[0];
    if (!record) {
      return res.status(400).json({
        error: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update profile
    await db.query(
      `UPDATE public.profiles SET password_hash = $1 WHERE LOWER(email) = $2`,
      [password_hash, cleanEmail]
    );

    // Mark as used
    await db.query(
      `UPDATE public.password_reset_tokens SET used = true WHERE id = $1`,
      [record.id]
    );

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('[ResetPassword] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const userRes = await db.query(
      `SELECT id, password_hash FROM public.profiles WHERE id = $1`,
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'The current password you entered is incorrect.' });
    }

    const isSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isSame) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE public.profiles SET password_hash = $1 WHERE id = $2`,
      [password_hash, req.user.id]
    );

    res.json({
      success: true,
      message: 'Your password has been changed successfully.'
    });
  } catch (err) {
    console.error('[ChangePassword] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to change password.' });
  }
};

module.exports = {
  signup,
  login,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  loadProfile // Exporting for other controllers if needed
};
