const db = require('../db');

const getDeployment = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM public.deployments WHERE student_id = $1`, [req.user.id]);
    const d = result.rows[0];
    if (!d) return res.json(null);
    res.json({
      studentId: d.student_id,
      companyId: d.company_id,
      company: d.company_name || '',
      supervisor: d.supervisor || '',
      supervisorEmail: d.supervisor_email || '',
      address: d.address || '',
      startDate: d.start_date || '',
      endDate: d.end_date || '',
      requiredHours: d.required_hours || 486,
      position: d.position || '',
      status: d.status || 'pending',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, s.student_id, s.section, s.phone, s.address, s.skills, s.emergency_contact, s.intended_company_id,
             d.company_name, d.position, d.required_hours, d.status as deployment_status
      FROM public.profiles p
      LEFT JOIN public.students s ON s.user_id = p.id
      LEFT JOIN public.deployments d ON d.student_id = p.id
      WHERE p.role = 'student'
    `);
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      studentId: r.student_id,
      section: r.section,
      phone: r.phone,
      address: r.address,
      skills: r.skills,
      emergencyContact: r.emergency_contact,
      intendedCompanyId: r.intended_company_id,
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

const getActiveCompanies = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, c.company_name, c.industry, c.description, c.company_address
      FROM public.profiles p
      JOIN public.companies c ON c.user_id = p.id
      WHERE p.role = 'company' AND c.moa_status = 'active'
    `);
    res.json(result.rows.map(c => ({
      id: c.id,
      name: c.company_name || c.name,
      industry: c.industry || '',
      description: c.description || '',
      address: c.company_address || ''
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const setIntendedCompany = async (req, res) => {
  try {
    const { companyId } = req.body;
    await db.query(
      `UPDATE public.students SET intended_company_id = $1 WHERE user_id = $2`,
      [companyId || null, req.user.id]
    );
    res.json({ success: true, intendedCompanyId: companyId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDeployment,
  getStudents,
  deployStudent,
  getActiveCompanies,
  setIntendedCompany
};
