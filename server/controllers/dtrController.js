const db = require('../db');
const { saveBase64Image } = require('../middleware/upload');

const clockDtr = async (req, res) => {
  try {
    const { date, mode, time, photo, day } = req.body;
    const existRes = await db.query(`SELECT * FROM public.dtr_records WHERE student_id = $1 AND date = $2`, [req.user.id, date]);
    const existing = existRes.rows[0];

    if (mode === 'in') {
      if (existing?.time_in) return res.status(400).json({ error: 'Already timed in' });
      let photoUrl = null;
      if (photo) photoUrl = saveBase64Image(photo, 'dtr', `${req.user.id}-${date}-in.jpg`);
      
      const insert = await db.query(
        `INSERT INTO public.dtr_records (student_id, date, day, time_in, time_in_photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, date, day || '', time, photoUrl]
      );
      res.json({ success: true, record: insert.rows[0] });
    } else {
      if (!existing?.time_in) return res.status(400).json({ error: 'Must time in first' });
      if (existing.time_out) return res.status(400).json({ error: 'Already timed out' });
      let photoUrl = null;
      if (photo) photoUrl = saveBase64Image(photo, 'dtr', `${req.user.id}-${date}-out.jpg`);
      
      // Parse time – accepts both "HH:MM" (24h) and "HH:MM AM/PM" (12h)
      const parseTime = (s) => {
        if (!s) return 0;
        const ampm = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (ampm) {
          let h = parseInt(ampm[1]);
          const min = parseInt(ampm[2]);
          const period = ampm[3].toUpperCase();
          if (period === 'PM' && h !== 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          return h * 60 + min;
        }
        const plain = s.match(/(\d+):(\d+)/);
        if (plain) return parseInt(plain[1]) * 60 + parseInt(plain[2]);
        return 0;
      };
      const diffMinutes = parseTime(time) - parseTime(existing.time_in);
      const hours = diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
      
      const upd = await db.query(
        `UPDATE public.dtr_records SET time_out = $1, time_out_photo_url = $2, hours = $3 WHERE id = $4 RETURNING *`,
        [time, photoUrl, hours, existing.id]
      );
      res.json({ success: true, record: upd.rows[0] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDtr = async (req, res) => {
  try {
    const result = await db.query(`SELECT *, TO_CHAR(date, 'YYYY-MM-DD') as date_str FROM public.dtr_records WHERE student_id = $1 ORDER BY date DESC`, [req.user.id]);
    res.json(result.rows.map(r => ({ date: r.date_str, day: r.day, timeIn: r.time_in, timeOut: r.time_out, timeInPhotoUrl: r.time_in_photo_url, timeOutPhotoUrl: r.time_out_photo_url, hours: Number(r.hours), remarks: r.remarks })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAdminDtr = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, TO_CHAR(d.date, 'YYYY-MM-DD') as date_str,
             p.name as student_name, p.id as student_profile_id,
             s.section, s.student_id as student_number,
             s.first_name, s.last_name
      FROM public.dtr_records d
      JOIN public.profiles p ON p.id = d.student_id
      LEFT JOIN public.students s ON s.user_id = d.student_id
      ORDER BY d.date DESC
      LIMIT 1000
    `);
    res.json(result.rows.map(r => ({
      studentId: r.student_id,
      studentName: r.last_name && r.first_name
        ? `${r.last_name}, ${r.first_name}`
        : r.student_name,
      studentNumber: r.student_number || '—',
      section: r.section || '—',
      date: r.date_str,
      day: r.day, timeIn: r.time_in, timeOut: r.time_out,
      hours: Number(r.hours), remarks: r.remarks,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  clockDtr,
  getDtr,
  getAdminDtr
};
