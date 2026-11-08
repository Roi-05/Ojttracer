const db = require('../db');
const bcrypt = require('bcrypt');

const VALID_COURSES = ['BSIT', 'BEED', 'BSSW', 'BSBA'];

/** GET /coordinators — list all coordinator accounts (superadmin only) */
const getCoordinators = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
    const result = await db.query(`
      SELECT id, email, name, coordinator_course, created_at
      FROM public.profiles
      WHERE role = 'coordinator'
      ORDER BY coordinator_course ASC, created_at ASC
    `);
    res.json(result.rows.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name,
      coordinatorCourse: r.coordinator_course,
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** POST /coordinators — create a coordinator account (superadmin only) */
const createCoordinator = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });

    const { email, password, name, coordinatorCourse } = req.body;
    if (!email || !password || !name || !coordinatorCourse) {
      return res.status(400).json({ error: 'email, password, name, and coordinatorCourse are required' });
    }
    if (!VALID_COURSES.includes(coordinatorCourse)) {
      return res.status(400).json({ error: `coordinatorCourse must be one of: ${VALID_COURSES.join(', ')}` });
    }

    // Check email uniqueness
    const existing = await db.query('SELECT id FROM public.profiles WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO public.profiles (email, password_hash, name, role, coordinator_course)
       VALUES ($1, $2, $3, 'coordinator', $4) RETURNING id, email, name, coordinator_course, created_at`,
      [email, password_hash, name, coordinatorCourse]
    );
    const row = result.rows[0];
    res.json({
      success: true,
      coordinator: {
        id: row.id,
        email: row.email,
        name: row.name,
        coordinatorCourse: row.coordinator_course,
        createdAt: row.created_at,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /coordinators/:id — update coordinator name, email, or course (superadmin only) */
const updateCoordinator = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });

    const { id } = req.params;
    const { name, email, coordinatorCourse, password } = req.body;

    // Verify target is a coordinator
    const check = await db.query(`SELECT role FROM public.profiles WHERE id = $1`, [id]);
    if (!check.rows[0] || check.rows[0].role !== 'coordinator') {
      return res.status(404).json({ error: 'Coordinator not found' });
    }
    if (coordinatorCourse && !VALID_COURSES.includes(coordinatorCourse)) {
      return res.status(400).json({ error: `coordinatorCourse must be one of: ${VALID_COURSES.join(', ')}` });
    }

    const fields = [];
    const values = [];
    if (name) { values.push(name); fields.push(`name = $${values.length}`); }
    if (email) { values.push(email); fields.push(`email = $${values.length}`); }
    if (coordinatorCourse) { values.push(coordinatorCourse); fields.push(`coordinator_course = $${values.length}`); }
    if (password) { values.push(await bcrypt.hash(password, 10)); fields.push(`password_hash = $${values.length}`); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await db.query(
      `UPDATE public.profiles SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, email, name, coordinator_course, created_at`,
      values
    );
    const row = result.rows[0];
    res.json({
      success: true,
      coordinator: {
        id: row.id,
        email: row.email,
        name: row.name,
        coordinatorCourse: row.coordinator_course,
        createdAt: row.created_at,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /coordinators/:id — deactivate (delete) coordinator account (superadmin only) */
const deleteCoordinator = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });

    const { id } = req.params;
    // Safety: cannot delete yourself
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    const check = await db.query(`SELECT role FROM public.profiles WHERE id = $1`, [id]);
    if (!check.rows[0] || check.rows[0].role !== 'coordinator') {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    await db.query(`DELETE FROM public.profiles WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getCoordinators, createCoordinator, updateCoordinator, deleteCoordinator };

