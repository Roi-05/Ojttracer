const db = require('../db');

const getDeployment = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, c.company_address, c.latitude, c.longitude, c.geofence_radius
      FROM public.deployments d
      LEFT JOIN public.companies c ON c.user_id = d.company_id
      WHERE d.student_id = $1
    `, [req.user.id]);
    const d = result.rows[0];
    if (!d) return res.json(null);

    const pick = (v) => {
      const s = (v || '').trim();
      return s && s !== '—' ? s : '';
    };
    const companyAddress = pick(d.company_address) || pick(d.address) || '';

    res.json({
      studentId: d.student_id,
      companyId: d.company_id,
      company: d.company_name || '',
      supervisor: d.supervisor || '',
      supervisorEmail: d.supervisor_email || '',
      address: companyAddress,
      companyAddress,
      startDate: d.start_date || '',
      endDate: d.end_date || '',
      requiredHours: d.required_hours || 486,
      position: d.position || '',
      status: d.status || 'pending',
      companyLat: d.latitude != null ? parseFloat(d.latitude) : null,
      companyLng: d.longitude != null ? parseFloat(d.longitude) : null,
      geofenceRadius: d.geofence_radius || 200,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, s.student_id, s.last_name, s.first_name, s.middle_name,
             s.section, s.course, s.year_level, s.date_of_birth, s.civil_status, s.sex,
             s.phone, s.address, s.skills, s.emergency_contact, s.intended_company_id, s.intended_position,
             s.father_name, s.father_occupation, s.father_phone, s.mother_name, s.mother_occupation, s.mother_phone,
             s.guardian_name, s.guardian_relationship, s.guardian_phone,
             d.company_name, d.position, d.required_hours, d.status as deployment_status,
             e.overall_score
      FROM public.profiles p
      LEFT JOIN public.students s ON s.user_id = p.id
      LEFT JOIN public.deployments d ON d.student_id = p.id
      LEFT JOIN public.evaluations e ON e.student_id = p.id
      WHERE p.role = 'student'
    `, []);
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      studentId: r.student_id,
      lastName: r.last_name || '',
      firstName: r.first_name || '',
      middleName: r.middle_name || '',
      section: r.section,
      course: r.course || 'BSIT',
      yearLevel: r.year_level || '4th Year',
      dateOfBirth: r.date_of_birth || null,
      civilStatus: r.civil_status || '',
      sex: r.sex || '',
      phone: r.phone,
      address: r.address,
      skills: r.skills,
      emergencyContact: r.emergency_contact,
      intendedCompanyId: r.intended_company_id,
      intendedPosition: r.intended_position || '',
      fatherName: r.father_name || '',
      fatherOccupation: r.father_occupation || '',
      fatherPhone: r.father_phone || '',
      motherName: r.mother_name || '',
      motherOccupation: r.mother_occupation || '',
      motherPhone: r.mother_phone || '',
      guardianName: r.guardian_name || '',
      guardianRelationship: r.guardian_relationship || '',
      guardianPhone: r.guardian_phone || '',
      performance: parseFloat(r.overall_score) || 0,
      deployment: r.company_name ? {
        company: r.company_name,
        position: r.position,
        requiredHours: r.required_hours,
        status: r.deployment_status
      } : null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deployStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { studentId } = req.params;
    const { companyId, companyName, position, startDate, endDate, requiredHours, supervisor, supervisorEmail, address } = req.body;
    await db.query(
      `INSERT INTO public.deployments (student_id, company_id, company_name, position, start_date, end_date, required_hours, supervisor, supervisor_email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (student_id) DO UPDATE SET 
        company_id=$2, company_name=$3, position=$4, start_date=$5, end_date=$6, required_hours=$7, 
        supervisor=$8, supervisor_email=$9, address=$10, status='ongoing'`,
      [studentId, companyId || null, companyName, position, startDate, endDate, requiredHours || 486, supervisor || '', supervisorEmail || '', address || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getActiveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await db.query(`
      SELECT p.id, p.name, c.company_name, c.signed_moa_url, c.moa_status
      FROM public.profiles p
      JOIN public.companies c ON c.user_id = p.id
      WHERE p.id = $1 AND p.role = 'company' AND c.moa_status = 'active'
    `, [companyId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Accredited company not found' });
    res.json({
      id: row.id,
      name: row.company_name || row.name,
      signedMoaUrl: row.signed_moa_url || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getActiveCompanies = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, c.company_name, c.industry, c.description, c.company_address, c.signed_moa_url
      FROM public.profiles p
      JOIN public.companies c ON c.user_id = p.id
      WHERE p.role = 'company' AND c.moa_status = 'active'
    `);
    res.json(result.rows.map(c => ({
      id: c.id,
      name: c.company_name || c.name,
      industry: c.industry || '',
      description: c.description || '',
      address: c.company_address || '',
      signedMoaUrl: c.signed_moa_url || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const setIntendedCompany = async (req, res) => {
  try {
    const { companyId, position } = req.body;
    if (companyId) {
      const companyRes = await db.query(
        `SELECT c.moa_status FROM public.companies c WHERE c.user_id = $1`,
        [companyId]
      );
      if (!companyRes.rows[0] || companyRes.rows[0].moa_status !== 'active') {
        return res.status(400).json({ error: 'Selected company is not accredited yet.' });
      }
    }
    await db.query(
      `UPDATE public.students SET intended_company_id = $1, intended_position = $2 WHERE user_id = $3`,
      [companyId || null, position ?? '', req.user.id]
    );
    res.json({ success: true, intendedCompanyId: companyId, intendedPosition: position ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDeployment,
  getStudents,
  deployStudent,
  getActiveCompany,
  getActiveCompanies,
  setIntendedCompany
};
