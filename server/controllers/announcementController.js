const db = require('../db');

const getAnnouncements = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM public.announcements ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { title, content, category, priority } = req.body;
    const id = Date.now().toString();
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const result = await db.query(
      `INSERT INTO public.announcements (id, title, content, category, priority, date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, title, content, category || 'update', priority || 'normal', date]
    );
    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await db.query(`DELETE FROM public.announcements WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
