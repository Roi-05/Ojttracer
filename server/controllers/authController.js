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

const signup = async (req, res) => {
  try {
    const { email, password, name, role, studentId, section, companyName, industry } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });

    // Prevent coordinator/superadmin/student self-registration
    // Students are created by coordinator via Excel import
    // Coordinators are created by superadmin
    if (role === 'coordinator' || role === 'superadmin' || role === 'admin' || role === 'student') {
      return res.status(403).json({ error:
        role === 'student' ? 'Student accounts are created by the OJT Coordinator. Please contact them if you cannot log in.' :
        'This account type cannot self-register. Contact your system administrator.'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO public.profiles (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, password_hash, name, role]
    );
    const userId = result.rows[0].id;

    if (role === 'student') {
      await db.query(
        `INSERT INTO public.students (user_id, student_id, section) VALUES ($1, $2, $3)`,
        [userId, studentId || '', section || '']
      );
    } else if (role === 'company') {
      await db.query(
        `INSERT INTO public.companies (user_id, company_name, industry, hr_contact, hr_email) VALUES ($1, $2, $3, $4, $5)`,
        [userId, companyName || name, industry || '', name, email]
      );
    }

    const token = generateToken({ id: userId, email, role });
    res.json({ success: true, userId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query(`SELECT * FROM public.profiles WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid login credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid login credentials' });

    const token = generateToken(user);
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
