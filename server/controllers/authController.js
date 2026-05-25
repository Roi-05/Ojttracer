const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken } = require('../auth');
const { normalizeUploadUrl } = require('../utils/uploadUrl');

async function loadProfile(userId) {
  const baseRes = await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [userId]);
  const base = baseRes.rows[0];
  if (!base) return null;

  const out = { id: base.id, email: base.email, name: base.name, role: base.role, avatarUrl: normalizeUploadUrl(base.avatar_url), createdAt: base.created_at };

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
      dateOfBirth: s.date_of_birth || null,
      civilStatus: s.civil_status || '',
      sex: s.sex || '',
      phone: s.phone,
      address: s.address,
      skills: s.skills,
      emergencyContact: s.emergency_contact,
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
      guardianPhone: s.guardian_phone || ''
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
    });
  }
  return out;
}

const signup = async (req, res) => {
  try {
    const { email, password, name, role, studentId, section, companyName, industry } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });

    // Prevent admin and student self-registration
    // Students are created by admin via Excel import
    if (role === 'admin' || role === 'student') {
      return res.status(403).json({ error: role === 'admin' ? 'Admin registration is disabled' : 'Student accounts are created by the OJT Coordinator. Please contact them if you cannot log in.' });
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

module.exports = {
  signup,
  login,
  me,
  loadProfile // Exporting for other controllers if needed
};
