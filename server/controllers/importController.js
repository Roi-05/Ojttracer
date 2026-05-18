const db = require('../db');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

// ── Gmail transporter ───────────────────────────────────────────────────────
// Configure via environment variables: GMAIL_USER, GMAIL_APP_PASSWORD
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not account password)
  },
});

const sendCredentialEmail = async (to, name, studentNo, password) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Import] Gmail not configured — skipping email for:', to);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"OJT Coordinator – Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your OJT Tracker Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; margin-bottom: 4px;">Welcome to OJT Tracker</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Pampanga State University – OJT Monitoring System</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your OJT Tracker account has been created by the OJT Coordinator. Use the credentials below to log in:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 8px 0 0; font-size: 14px;"><strong>Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${password}</code></p>
        </div>
        <p style="font-size: 13px; color: #6b7280;">Please change your password after logging in for the first time.</p>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" 
           style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
          Log In Now
        </a>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">This email was sent by the OJT Coordinator. If you believe this was sent in error, please ignore it.</p>
      </div>
    `,
  });
};

// ── Excel column map (case-insensitive header matching) ──────────────────────
const col = (row, ...keys) => {
  for (const k of keys) {
    const found = Object.keys(row).find(h => h.trim().toLowerCase() === k.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
      return row[found]; // Return raw value — callers stringify as needed
    }
  }
  return '';
};

// Normalize any date value from xlsx into a YYYY-MM-DD string safe for PostgreSQL
const parseDob = (raw) => {
  if (!raw || raw === '') return null;

  // xlsx with cellDates:true returns JS Date objects
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    // Use UTC parts to avoid local timezone shift
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(raw).trim();

  // Already ISO-like: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // Common PH format: MM/DD/YYYY or DD/MM/YYYY — try both, prefer MM/DD/YYYY
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const [a, b, c] = slashParts.map(Number);
    if (c > 31) {
      // c is year
      const y = String(c).padStart(4, '20');
      const m = String(a).padStart(2, '0');
      const d = String(b).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback: try JS Date parse (may have timezone issues but better than crashing)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dy = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  }

  return null;
};

const importStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'Excel file is empty or unreadable' });

    const results = { created: 0, updated: 0, skipped: 0, errors: [], emailsSent: 0 };

    for (const row of rows) {
      const lastName   = String(col(row, 'Last Name', 'lastname', 'last_name') || '').trim();
      const firstName  = String(col(row, 'First Name', 'firstname', 'first_name') || '').trim();
      const middleName = String(col(row, 'Middle Name', 'middlename', 'middle_name') || '').trim();
      const studentNo  = String(col(row, 'Student No', 'student_no', 'studentno', 'student_id', 'id') || '').trim();
      const section    = String(col(row, 'Section', 'sec') || '').trim();
      const email      = String(col(row, 'Email', 'psu email', 'email address') || '').trim();
      const dob        = parseDob(col(row, 'Date of Birth', 'dob', 'birthdate'));
      const sex        = String(col(row, 'Sex', 'gender') || '').trim();
      const civilStatus = String(col(row, 'Civil Status', 'civil_status', 'civilstatus') || '').trim();
      const address    = String(col(row, 'Address', 'home address') || '').trim();
      const course     = String(col(row, 'Course') || '').trim() || 'BSIT';
      const yearLevel  = String(col(row, 'Year Level', 'year', 'year_level') || '').trim() || '4th Year';

      if (!email || !studentNo) {
        results.errors.push({ row: JSON.stringify(row), reason: 'Missing Email or Student No' });
        results.skipped++;
        continue;
      }

      const fullName = [firstName, middleName ? middleName.charAt(0) + '.' : '', lastName].filter(Boolean).join(' ');
      const defaultPassword = studentNo; // Student No as initial password
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      // Check if email already exists
      const existing = await db.query('SELECT id FROM public.profiles WHERE email = $1', [email]);

      if (existing.rows.length > 0) {
        // Update existing student profile
        const userId = existing.rows[0].id;
        await db.query(
          `UPDATE public.students SET
            student_id=$1, last_name=$2, first_name=$3, middle_name=$4,
            section=$5, course=$6, year_level=$7, date_of_birth=$8,
            civil_status=$9, sex=$10, address=$11
           WHERE user_id=$12`,
          [studentNo, lastName, firstName, middleName, section, course, yearLevel,
           dob || null, civilStatus, sex, address, userId]
        );
        results.updated++;
      } else {
        // Create new profile + student record
        const profileRes = await db.query(
          `INSERT INTO public.profiles (email, password_hash, name, role)
           VALUES ($1, $2, $3, 'student') RETURNING id`,
          [email, passwordHash, fullName]
        );
        const userId = profileRes.rows[0].id;
        await db.query(
          `INSERT INTO public.students
            (user_id, student_id, last_name, first_name, middle_name,
             section, course, year_level, date_of_birth, civil_status, sex, address)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [userId, studentNo, lastName, firstName, middleName,
           section, course, yearLevel, dob || null, civilStatus, sex, address]
        );
        results.created++;

        // Send credentials email in background to avoid blocking HTTP response
        sendCredentialEmail(email, fullName || studentNo, studentNo, defaultPassword)
          .catch((emailErr) => {
            console.warn('[Import] Email failed for', email, ':', emailErr.message);
          });
        results.emailsSent++;
      }
    }

    res.json({
      success: true,
      summary: `${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
      emailsSent: results.emailsSent,
      errors: results.errors,
      ...results,
    });
  } catch (err) {
    console.error('[Import] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Preview-only: parse and return rows without saving
const previewImport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    res.json({ rows: rows.slice(0, 50), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { importStudents, previewImport };
