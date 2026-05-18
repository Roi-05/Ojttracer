const db = require('../db');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR, saveBase64Image } = require('../middleware/upload');

const getCompanies = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.email, p.name, p.role, p.created_at,
             c.company_name, c.industry, c.company_address, c.website,
             c.hr_contact, c.hr_email, c.phone as company_phone,
             c.description, c.moa_status, c.accredited_until, c.signed_moa_url
      FROM public.profiles p
      LEFT JOIN public.companies c ON c.user_id = p.id
      WHERE p.role = 'company'
    `);
    res.json(result.rows.map(c => ({
      id: c.id,
      email: c.email,
      name: c.name,
      role: c.role,
      createdAt: c.created_at,
      companyName: c.company_name || '',
      industry: c.industry || '',
      companyAddress: c.company_address || '',
      website: c.website || '',
      hrContact: c.hr_contact || '',
      hrEmail: c.hr_email || '',
      phone: c.company_phone || '',
      description: c.description || '',
      moaStatus: c.moa_status || 'pending',
      accreditedUntil: c.accredited_until || '—',
      signedMoaUrl: c.signed_moa_url || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyCompany = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { id } = req.params;
    const { status } = req.body;
    await db.query(`UPDATE public.companies SET moa_status = $1 WHERE user_id = $2`, [status || 'active', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateMoa = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { id } = req.params;
    const { status, expiryDate } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    await db.query(
      `UPDATE public.companies SET moa_status = $1, accredited_until = $2 WHERE user_id = $3`,
      [status, expiryDate || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadSignedMoa = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Company only' });
    const { fileData, fileName } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file provided' });

    const ext = fileName ? path.extname(fileName) : '.pdf';
    const fname = `${req.user.id}-signed-moa-${Date.now()}${ext}`;
    const moaDir = path.join(UPLOADS_DIR, 'moa');
    if (!fs.existsSync(moaDir)) fs.mkdirSync(moaDir, { recursive: true });
    const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    fs.writeFileSync(path.join(moaDir, fname), Buffer.from(base64, 'base64'));
    const fileUrl = `http://localhost:3000/uploads/moa/${fname}`;

    await db.query(
      `UPDATE public.companies SET signed_moa_url = $1, moa_status = 'submitted' WHERE user_id = $2`,
      [fileUrl, req.user.id]
    );
    res.json({ success: true, fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMoaTemplate = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM public.templates WHERE doc_slug = 'moa_template'`);
    const row = result.rows[0];
    res.json(row ? { fileUrl: row.file_url, name: row.name, size: row.size, uploadedDate: row.uploaded_date } : { fileUrl: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getInterns = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Company only' });
    const result = await db.query(`
      SELECT p.id, p.name, 
             d.position, d.supervisor, d.start_date, d.end_date, d.required_hours, d.status,
             (SELECT COALESCE(SUM(hours), 0) FROM public.dtr_records WHERE student_id = p.id) as completed_hours,
             e.overall_score
      FROM public.deployments d 
      JOIN public.profiles p ON p.id = d.student_id 
      LEFT JOIN public.students s ON s.user_id = d.student_id 
      LEFT JOIN public.evaluations e ON e.student_id = d.student_id
      WHERE d.company_id = $1
    `, [req.user.id]);
    
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      course: r.course || 'BSIT',
      completedHours: parseFloat(r.completed_hours),
      performance: parseFloat(r.overall_score) || 0,
      deployment: {
        position: r.position,
        supervisor: r.supervisor,
        startDate: r.start_date,
        endDate: r.end_date,
        requiredHours: r.required_hours,
        status: r.status
      }
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCompanies,
  verifyCompany,
  updateMoa,
  uploadSignedMoa,
  getMoaTemplate,
  getInterns
};
