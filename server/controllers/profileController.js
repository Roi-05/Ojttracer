const db = require('../db');
const { loadProfile } = require('./authController');

const updateProfile = async (req, res) => {
  try {
    const body = req.body;
    // Update base profile name if provided
    if (body.name) {
      await db.query(`UPDATE public.profiles SET name = $1 WHERE id = $2`, [body.name, req.user.id]);
    }
    // Update role-specific table
    const roleRes = await db.query(`SELECT role FROM public.profiles WHERE id = $1`, [req.user.id]);
    const role = roleRes.rows[0]?.role;
    if (role === 'student') {
      const fields = [];
      const vals = [];
      let i = 1;
      if (body.studentId !== undefined) { fields.push(`student_id=$${i++}`); vals.push(body.studentId); }
      if (body.section !== undefined) { fields.push(`section=$${i++}`); vals.push(body.section); }
      if (body.phone !== undefined) { fields.push(`phone=$${i++}`); vals.push(body.phone); }
      if (body.address !== undefined) { fields.push(`address=$${i++}`); vals.push(body.address); }
      if (body.skills !== undefined) { fields.push(`skills=$${i++}`); vals.push(JSON.stringify(body.skills)); }
      if (body.emergencyContact !== undefined) { fields.push(`emergency_contact=$${i++}`); vals.push(body.emergencyContact); }
      if (fields.length) { vals.push(req.user.id); await db.query(`UPDATE public.students SET ${fields.join(', ')} WHERE user_id=$${i}`, vals); }
    } else if (role === 'company') {
      const fields = [];
      const vals = [];
      let i = 1;
      if (body.companyName !== undefined) { fields.push(`company_name=$${i++}`); vals.push(body.companyName); }
      if (body.industry !== undefined) { fields.push(`industry=$${i++}`); vals.push(body.industry); }
      if (body.companyAddress !== undefined) { fields.push(`company_address=$${i++}`); vals.push(body.companyAddress); }
      if (body.website !== undefined) { fields.push(`website=$${i++}`); vals.push(body.website); }
      if (body.hrContact !== undefined) { fields.push(`hr_contact=$${i++}`); vals.push(body.hrContact); }
      if (body.hrEmail !== undefined) { fields.push(`hr_email=$${i++}`); vals.push(body.hrEmail); }
      if (body.phone !== undefined) { fields.push(`phone=$${i++}`); vals.push(body.phone); }
      if (body.description !== undefined) { fields.push(`description=$${i++}`); vals.push(body.description); }
      if (fields.length) { vals.push(req.user.id); await db.query(`UPDATE public.companies SET ${fields.join(', ')} WHERE user_id=$${i}`, vals); }
    }
    const updated = await loadProfile(req.user.id);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  updateProfile
};
