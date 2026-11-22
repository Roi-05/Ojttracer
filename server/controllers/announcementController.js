const db = require('../db');

let colEnsured = false;
async function ensureCourseColumn() {
  if (colEnsured) return;
  try {
    await db.query(`ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'BSIT'`);
    colEnsured = true;
  } catch (err) {
    console.warn('[Announcements] course column check:', err.message);
  }
}

const getAnnouncements = async (req, res) => {
  try {
    await ensureCourseColumn();

    if (req.user?.role === 'coordinator') {
      const course = (req.user.coordinatorCourse || 'BSIT').toUpperCase();
      const result = await db.query(
        `SELECT * FROM public.announcements WHERE UPPER(COALESCE(course, 'BSIT')) = $1 ORDER BY created_at DESC`,
        [course]
      );
      return res.json(result.rows);
    }

    if (req.user?.role === 'student') {
      const stuRes = await db.query(`SELECT course FROM public.students WHERE user_id = $1`, [req.user.id]);
      const course = (stuRes.rows[0]?.course || 'BSIT').toUpperCase();
      const result = await db.query(
        `SELECT * FROM public.announcements WHERE UPPER(COALESCE(course, 'BSIT')) = $1 ORDER BY created_at DESC`,
        [course]
      );
      return res.json(result.rows);
    }

    if (req.user?.role === 'company') {
      return res.json([]);
    }

    // Superadmin sees all announcements across courses
    const result = await db.query(`SELECT * FROM public.announcements ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    if (!['coordinator', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Coordinator only' });
    }
    await ensureCourseColumn();
    const { title, content, category, priority } = req.body;
    const course = (req.user.coordinatorCourse || req.body.course || 'BSIT').toUpperCase();
    const id = Date.now().toString();
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const result = await db.query(
      `INSERT INTO public.announcements (id, title, content, category, priority, date, course)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, title, content, category || 'update', priority || 'normal', date, course]
    );
    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    if (!['coordinator', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Coordinator only' });
    }
    await ensureCourseColumn();
    if (req.user.role === 'coordinator') {
      const course = (req.user.coordinatorCourse || 'BSIT').toUpperCase();
      await db.query(
        `DELETE FROM public.announcements WHERE id = $1 AND UPPER(COALESCE(course, 'BSIT')) = $2`,
        [req.params.id, course]
      );
    } else {
      await db.query(`DELETE FROM public.announcements WHERE id = $1`, [req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
