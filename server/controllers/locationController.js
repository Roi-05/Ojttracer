const db = require('../db');

/**
 * POST /location/ping
 * Called by the student's browser while they are clocked in.
 * Body: { latitude, longitude, accuracy }
 */
const pingLocation = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Students only' });
    }
    const { latitude, longitude, accuracy } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    // Only accept pings while the student is actively clocked in today
    const todayRes = await db.query(`SELECT (NOW() AT TIME ZONE 'Asia/Manila')::date AS today`);
    const today = todayRes.rows[0].today;

    const dtrRes = await db.query(
      `SELECT id FROM public.dtr_records
       WHERE student_id = $1 AND date = $2 AND time_in IS NOT NULL AND time_out IS NULL`,
      [req.user.id, today]
    );
    if (!dtrRes.rows.length) {
      return res.status(409).json({ error: 'No active clock-in found for today' });
    }

    await db.query(
      `INSERT INTO public.location_pings (student_id, latitude, longitude, accuracy)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, latitude, longitude, accuracy ?? null]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /location/interns
 * Called by the supervisor every 30 seconds.
 * Returns ALL interns currently clocked in today (deployed at this company),
 * plus their latest location ping if one exists.
 * Interns with no ping yet are still returned — with null lat/lng.
 */
const getActiveInternLocations = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ error: 'Company only' });
    }

    // Use AT TIME ZONE to get the current date in PH time (UTC+8),
    // matching the client-side date stored in dtr_records.
    const todayRes = await db.query(`SELECT (NOW() AT TIME ZONE 'Asia/Manila')::date AS today`);
    const today = todayRes.rows[0].today;

    const result = await db.query(
      `SELECT
         dtr.student_id,
         p.name        AS student_name,
         s.first_name,
         s.last_name,
         s.student_id  AS student_number,
         p.avatar_url,
         dtr.time_in,
         lp.latitude,
         lp.longitude,
         lp.accuracy,
         lp.pinged_at
       FROM public.dtr_records dtr
       JOIN public.deployments dep
            ON dep.student_id = dtr.student_id
           AND dep.company_id = $1
       JOIN public.profiles p ON p.id = dtr.student_id
       LEFT JOIN public.students s ON s.user_id = dtr.student_id
       LEFT JOIN LATERAL (
         SELECT latitude, longitude, accuracy, pinged_at
         FROM public.location_pings
         WHERE student_id = dtr.student_id
         ORDER BY pinged_at DESC
         LIMIT 1
       ) lp ON true
       WHERE dtr.date = $2
         AND dtr.time_in IS NOT NULL
         AND dtr.time_out IS NULL`,
      [req.user.id, today]
    );

    res.json(result.rows.map(r => ({
      studentId: r.student_id,
      studentName: r.last_name && r.first_name
        ? `${r.first_name} ${r.last_name}`
        : r.student_name,
      studentNumber: r.student_number || '—',
      avatarUrl: r.avatar_url || null,
      timeIn: r.time_in || null,
      latitude: r.latitude != null ? parseFloat(r.latitude) : null,
      longitude: r.longitude != null ? parseFloat(r.longitude) : null,
      accuracy: r.accuracy ?? null,
      pingedAt: r.pinged_at || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { pingLocation, getActiveInternLocations };
