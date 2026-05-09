const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── Storage Init ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const makeStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, subfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadTemplate = multer({ storage: makeStorage('templates'), limits: { fileSize: 20 * 1024 * 1024 } });
const uploadDoc     = multer({ storage: makeStorage('documents'), limits: { fileSize: 20 * 1024 * 1024 } });
const upload = uploadDoc; // legacy alias

function saveBase64Image(dataUrl, folder, filename) {
  const baseDir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const buffer = Buffer.from(base64, 'base64');
  const filepath = path.join(baseDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `http://localhost:3000/uploads/${folder}/${filename}`;
}

app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Health ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── AUTH: Signup ───────────────────────────────────────────────────────
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role, studentId, section, companyName, industry } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });

    // Prevent admin registration
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin registration is disabled' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO public.profiles (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, password_hash, name, role]
    );
    const userId = result.rows[0].id;

    if (role === 'student') {
      await db.query(
        `INSERT INTO public.students (user_id, student_id, section) VALUES ($1, $2, $3)`,
        [userId, studentId || '', section || '']
      );
    } else if (role === 'company') {
      await db.query(
        `INSERT INTO public.companies (user_id, company_name, industry, hr_contact, hr_email) VALUES ($1, $2, $3, $4, $5)`,
        [userId, companyName || name, industry || '', name, email]
      );
    }

    const token = generateToken({ id: userId, email, role });
    res.json({ success: true, userId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Login ────────────────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query(`SELECT * FROM public.profiles WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid login credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid login credentials' });

    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function loadProfile(userId) {
  const baseRes = await db.query(`SELECT * FROM public.profiles WHERE id = $1`, [userId]);
  const base = baseRes.rows[0];
  if (!base) return null;

  const out = { id: base.id, email: base.email, name: base.name, role: base.role, createdAt: base.created_at };

  if (base.role === 'student') {
    const sRes = await db.query(`SELECT * FROM public.students WHERE user_id = $1`, [userId]);
    const s = sRes.rows[0];
    if (s) Object.assign(out, { studentId: s.student_id, section: s.section, phone: s.phone, address: s.address, skills: s.skills, emergencyContact: s.emergency_contact });
  } else if (base.role === 'company') {
    const cRes = await db.query(`SELECT * FROM public.companies WHERE user_id = $1`, [userId]);
    const cmp = cRes.rows[0];
    if (cmp) Object.assign(out, { companyName: cmp.company_name, industry: cmp.industry, companyAddress: cmp.company_address, website: cmp.website, hrContact: cmp.hr_contact, hrEmail: cmp.hr_email, phone: cmp.phone, description: cmp.description, moaStatus: cmp.moa_status, accreditedUntil: cmp.accredited_until });
  }
  return out;
}

// ─── AUTH: Me ───────────────────────────────────────────────────────────
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const profile = await loadProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PROFILE: Update ───────────────────────────────────────────────────
app.put('/profile', authMiddleware, async (req, res) => {
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
});

// ─── DTR: Clock in/out ──────────────────────────────────────────────────
app.post('/dtr/clock', authMiddleware, async (req, res) => {
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
      
      const parse = (s) => {
        const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1]); const min = parseInt(m[2]); const p = m[3].toUpperCase();
        if (p === "PM" && h !== 12) h += 12;
        if (p === "AM" && h === 12) h = 0;
        return h + min / 60;
      };
      const hours = Math.max(0, Math.round((parse(time) - parse(existing.time_in)) * 100) / 100);
      
      const upd = await db.query(
        `UPDATE public.dtr_records SET time_out = $1, time_out_photo_url = $2, hours = $3 WHERE id = $4 RETURNING *`,
        [time, photoUrl, hours, existing.id]
      );
      res.json({ success: true, record: upd.rows[0] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DTR: Get ───────────────────────────────────────────────────────────
app.get('/dtr', authMiddleware, async (req, res) => {
  const result = await db.query(`SELECT * FROM public.dtr_records WHERE student_id = $1 ORDER BY date DESC`, [req.user.id]);
  res.json(result.rows.map(r => ({ date: r.date.toISOString().split('T')[0], day: r.day, timeIn: r.time_in, timeOut: r.time_out, timeInPhotoUrl: r.time_in_photo_url, timeOutPhotoUrl: r.time_out_photo_url, hours: Number(r.hours), remarks: r.remarks })));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

// ─── Documents ─────────────────────────────────────────────────────────
// Student: get own docs
app.get('/documents', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.query;
    // Admin can query all students; student can only see their own
    if (req.user.role === 'admin') {
      if (studentId) {
        // Per-student docs (for review modal)
        const docsRes = await db.query(`SELECT d.*, p.name as student_name FROM public.documents d JOIN public.profiles p ON p.id = d.student_id WHERE d.student_id = $1`, [studentId]);
        return res.json(docsRes.rows.map(r => ({ id: r.id, studentId: r.student_id, name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })));
      }
      // All students aggregate
      const profiles = await db.query(`SELECT p.id, p.name, s.student_id as student_no, s.section FROM public.profiles p LEFT JOIN public.students s ON s.user_id = p.id WHERE p.role = 'student'`);
      const all = [];
      for (const prof of profiles.rows) {
        const docsRes = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [prof.id]);
        all.push({ studentId: prof.id, studentName: prof.name, studentNo: prof.student_no || '—', section: prof.section || '—', docs: docsRes.rows.map(r => ({ name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })) });
      }
      return res.json(all);
    }
    // Student
    const result = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [req.user.id]);
    res.json(result.rows.map(r => ({ id: r.id, name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Student: submit / replace a document
app.post('/documents/submit', authMiddleware, uploadDoc.single('file'), async (req, res) => {
  try {
    const docName = req.body.docName;
    if (!docName) return res.status(400).json({ error: 'docName is required' });

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      // Actual file upload via multipart
      fileUrl = `http://localhost:3000/uploads/documents/${req.file.filename}`;
      fileName = req.file.originalname;
    } else if (req.body.fileData) {
      // Base64 fallback
      const ext = req.body.fileName ? path.extname(req.body.fileName) : '.pdf';
      const fname = `${Date.now()}${ext}`;
      const docDir = path.join(UPLOADS_DIR, 'documents');
      if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
      const base64 = req.body.fileData.includes(',') ? req.body.fileData.split(',')[1] : req.body.fileData;
      fs.writeFileSync(path.join(docDir, fname), Buffer.from(base64, 'base64'));
      fileUrl = `http://localhost:3000/uploads/documents/${fname}`;
      fileName = req.body.fileName || fname;
    } else {
      return res.status(400).json({ error: 'No file provided' });
    }

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    await db.query(
      `INSERT INTO public.documents (student_id, name, status, file_url, uploaded_date)
       VALUES ($1, $2, 'pending', $3, $4)
       ON CONFLICT (student_id, name) DO UPDATE SET status='pending', file_url=$3, uploaded_date=$4, review_note=''`,
      [req.user.id, docName, fileUrl, today]
    );
    res.json({ success: true, fileUrl, fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve / reject a document
app.put('/documents/review', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { studentId, docName, status, note } = req.body;
    if (!studentId || !docName || !status) return res.status(400).json({ error: 'Missing fields' });
    await db.query(
      `UPDATE public.documents SET status=$1, review_note=$2 WHERE student_id=$3 AND name=$4`,
      [status, note || '', studentId, docName]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Templates ─────────────────────────────────────────────────────────
app.get('/templates', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM public.templates ORDER BY name`);
    res.json(result.rows.map(r => ({ docSlug: r.doc_slug, name: r.name, fileUrl: r.file_url, size: r.size, uploadedDate: r.uploaded_date })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: upload a template
app.post('/templates', authMiddleware, uploadTemplate.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const docName = req.body.docName;
    if (!docName) return res.status(400).json({ error: 'docName is required' });

    let fileUrl = null;
    let fileSize = '—';

    if (req.file) {
      fileUrl = `http://localhost:3000/uploads/templates/${req.file.filename}`;
      fileSize = `${(req.file.size / 1024).toFixed(0)} KB`;
    } else if (req.body.fileData) {
      const ext = req.body.fileName ? path.extname(req.body.fileName) : '.pdf';
      const fname = `${Date.now()}${ext}`;
      const tplDir = path.join(UPLOADS_DIR, 'templates');
      if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });
      const base64 = req.body.fileData.includes(',') ? req.body.fileData.split(',')[1] : req.body.fileData;
      const buf = Buffer.from(base64, 'base64');
      fs.writeFileSync(path.join(tplDir, fname), buf);
      fileUrl = `http://localhost:3000/uploads/templates/${fname}`;
      fileSize = `${(buf.length / 1024).toFixed(0)} KB`;
    } else {
      return res.status(400).json({ error: 'No file provided' });
    }

    const slug = docName.replace(/\s+/g, '_').toLowerCase();
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    await db.query(
      `INSERT INTO public.templates (doc_slug, name, file_url, size, uploaded_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (doc_slug) DO UPDATE SET name=$2, file_url=$3, size=$4, uploaded_date=$5`,
      [slug, docName, fileUrl, fileSize, today]
    );
    res.json({ success: true, fileUrl, fileSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete a template
app.delete('/templates/:slug', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const result = await db.query(`DELETE FROM public.templates WHERE doc_slug=$1 RETURNING file_url`, [req.params.slug]);
    const row = result.rows[0];
    if (row?.file_url) {
      const local = row.file_url.replace('http://localhost:3000/uploads/', '');
      const fullPath = path.join(UPLOADS_DIR, local);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Announcements ─────────────────────────────────────────────────────
app.get('/announcements', async (req, res) => {
  const result = await db.query(`SELECT * FROM public.announcements ORDER BY created_at DESC`);
  res.json(result.rows);
});

app.post('/announcements', authMiddleware, async (req, res) => {
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
});

app.delete('/announcements/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(`DELETE FROM public.announcements WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin DTR (all students) ───────────────────────────────────────────
app.get('/admin/dtr', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, p.name as student_name
      FROM public.dtr_records d
      JOIN public.profiles p ON p.id = d.student_id
      ORDER BY d.date DESC
      LIMIT 200
    `);
    res.json(result.rows.map(r => ({
      studentId: r.student_id, studentName: r.student_name,
      date: r.date.toISOString().split('T')[0],
      day: r.day, timeIn: r.time_in, timeOut: r.time_out,
      hours: Number(r.hours), remarks: r.remarks,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Deployment ─────────────────────────────────────────────────────────
app.get('/deployment', authMiddleware, async (req, res) => {
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
});

// ─── Students / Companies ───────────────────────────────────────────────
app.get('/students', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, s.student_id, s.section, s.phone, s.address, s.skills, s.emergency_contact,
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
});

app.get('/companies', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.email, p.name, p.role, p.created_at,
             c.company_name, c.industry, c.company_address, c.website,
             c.hr_contact, c.hr_email, c.phone as company_phone,
             c.description, c.moa_status, c.accredited_until
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
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/companies/:id/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { id } = req.params;
    const { status } = req.body;
    await db.query(`UPDATE public.companies SET moa_status = $1 WHERE user_id = $2`, [status || 'active', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/interns', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Company only' });
    const result = await db.query(`
      SELECT p.id, p.name, 
             d.position, d.supervisor, d.start_date, d.end_date, d.required_hours, d.status,
             (SELECT COALESCE(SUM(hours), 0) FROM public.dtr_records WHERE student_id = p.id) as completed_hours
      FROM public.deployments d 
      JOIN public.profiles p ON p.id = d.student_id 
      LEFT JOIN public.students s ON s.user_id = d.student_id 
      WHERE d.company_id = $1
    `, [req.user.id]);
    
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      course: r.course || 'BSIT',
      completedHours: parseFloat(r.completed_hours),
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
});

// ─── Student deploy ──────────────────────────────────────────────────────
app.put('/students/:studentId/deploy', authMiddleware, async (req, res) => {
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
});

// ─── Accomplishments (full CRUD) ────────────────────────────────────────
app.post('/accomplishments', authMiddleware, async (req, res) => {
  try {
    const { date, hours, details, photo } = req.body;
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
});

app.get('/accomplishments', authMiddleware, async (req, res) => {
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
});

// ─── Evaluations ────────────────────────────────────────────────────────
app.get('/evaluations/:studentId', authMiddleware, async (req, res) => {
  res.json(null);
});

app.post('/evaluations', authMiddleware, async (req, res) => {
  res.json({ success: true });
});
