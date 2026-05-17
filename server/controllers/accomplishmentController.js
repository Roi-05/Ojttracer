const db = require('../db');
const { saveBase64Image } = require('../middleware/upload');

const createAccomplishment = async (req, res) => {
  try {
    const { date, hours, details, photo } = req.body;

    // Enforce one entry per student per day
    const dup = await db.query(
      `SELECT id FROM public.accomplishments WHERE student_id = $1 AND date = $2`,
      [req.user.id, date]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: `A journal entry for ${date} already exists.` });
    }

    let photoUrl = null;
    if (photo) photoUrl = saveBase64Image(photo, 'accomplishments', `${req.user.id}-${Date.now()}.jpg`);
    const id = Date.now().toString();
    const result = await db.query(
      `INSERT INTO public.accomplishments (id, student_id, date, hours, details, photo_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.user.id, date, hours, details, photoUrl]
    );
    res.json({ success: true, accomplishment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAccomplishments = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await db.query(`SELECT a.*, p.name as student_name FROM public.accomplishments a JOIN public.profiles p ON p.id = a.student_id ORDER BY a.created_at DESC`);
      return res.json(result.rows.map(r => ({ id: r.id, studentId: r.student_id, studentName: r.student_name, date: r.date, hours: r.hours, details: r.details, photoUrl: r.photo_url, status: r.status, createdAt: r.created_at })));
    }
    if (req.user.role === 'company') {
      const result = await db.query(`
        SELECT a.*, p.name as student_name 
        FROM public.accomplishments a 
        JOIN public.profiles p ON p.id = a.student_id 
        JOIN public.deployments d ON d.student_id = a.student_id
        WHERE d.company_id = $1
        ORDER BY a.created_at DESC
      `, [req.user.id]);
      return res.json(result.rows.map(r => ({ id: r.id, studentId: r.student_id, studentName: r.student_name, date: r.date, hours: r.hours, details: r.details, photoUrl: r.photo_url, status: r.status, createdAt: r.created_at })));
    }
    const result = await db.query(`SELECT * FROM public.accomplishments WHERE student_id = $1 ORDER BY date DESC`, [req.user.id]);
    res.json(result.rows.map(r => ({ id: r.id, date: r.date, hours: r.hours, details: r.details, photoUrl: r.photo_url, status: r.status })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reviewAccomplishment = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Company only' });
    const { studentId, id } = req.params;
    const { status, note } = req.body;
    await db.query(
      `UPDATE public.accomplishments SET status = $1, review_note = $2 WHERE id = $3 AND student_id = $4`,
      [status, note || '', id, studentId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAccomplishment,
  getAccomplishments,
  reviewAccomplishment
};
