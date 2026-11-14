const db = require('../db');
const { publicUploadPath } = require('../utils/uploadUrl');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

const getDocuments = async (req, res) => {
  warmUpGotenberg();
  try {
    const { studentId } = req.query;
    // Admin can query all students; student can only see their own; company can query their assigned interns
    if (['coordinator', 'superadmin'].includes(req.user.role)) {
      if (studentId) {
        // Per-student docs (for review modal)
        const docsRes = await db.query(`SELECT d.*, p.name as student_name FROM public.documents d JOIN public.profiles p ON p.id = d.student_id WHERE d.student_id = $1`, [studentId]);
        return res.json(docsRes.rows.map(r => ({ id: r.id, studentId: r.student_id, name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })));
      }
      // All students aggregate (scoped by course for coordinator; all for superadmin)
      const isSuperadmin = req.user.role === 'superadmin';
      const docParams = [];
      const docCourseClause = isSuperadmin
        ? ''
        : (() => { docParams.push(req.user.coordinatorCourse || 'BSIT'); return 'AND s.course = $' + docParams.length; })();
      const profiles = await db.query(`
        SELECT p.id, p.name, s.student_id as student_no, s.section, s.course, s.school_year, d.company_name
        FROM public.profiles p 
        LEFT JOIN public.students s ON s.user_id = p.id 
        LEFT JOIN public.deployments d ON d.student_id = p.id
        WHERE p.role = 'student' ${docCourseClause}
      `, docParams);
      const all = [];
      for (const prof of profiles.rows) {
        const docsRes = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [prof.id]);
        all.push({
          studentId: prof.id,
          studentName: prof.name,
          studentNo: prof.student_no || '—',
          section: prof.section || '—',
          schoolYear: prof.school_year || '2025-2026',
          isDeployed: !!prof.company_name,
          assignedCompany: prof.company_name || null,
          docs: docsRes.rows.map(r => ({ name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note }))
        });
      }
      return res.json(all);
    }

    if (req.user.role === 'company') {
      if (studentId) {
        // Strict tenant isolation: verify that the student is deployed to this company
        const depCheck = await db.query(
          `SELECT 1 FROM public.deployments WHERE student_id = $1 AND company_id = $2`,
          [studentId, req.user.id]
        );
        if (depCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Not authorized to view documents for this student' });
        }
        const docsRes = await db.query(
          `SELECT d.*, p.name as student_name FROM public.documents d JOIN public.profiles p ON p.id = d.student_id WHERE d.student_id = $1`,
          [studentId]
        );
        return res.json(docsRes.rows.map(r => ({
          id: r.id,
          studentId: r.student_id,
          name: r.name,
          status: r.status,
          fileUrl: r.file_url,
          uploadedDate: r.uploaded_date,
          reviewNote: r.review_note,
        })));
      }

      // Aggregate of all interns deployed to this company
      const internsRes = await db.query(`
        SELECT p.id, p.name, s.student_id as student_no, s.course, s.section, d.position, d.supervisor, d.status as deployment_status
        FROM public.deployments d
        JOIN public.profiles p ON p.id = d.student_id
        LEFT JOIN public.students s ON s.user_id = d.student_id
        WHERE d.company_id = $1
        ORDER BY p.name ASC
      `, [req.user.id]);

      const allInternDocs = [];
      for (const intern of internsRes.rows) {
        const docsRes = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [intern.id]);
        allInternDocs.push({
          studentId: intern.id,
          studentName: intern.name,
          studentNo: intern.student_no || '—',
          course: intern.course || 'BSIT',
          section: intern.section || '—',
          position: intern.position || '—',
          supervisor: intern.supervisor || '—',
          deploymentStatus: intern.deployment_status || 'ongoing',
          docs: docsRes.rows.map(r => ({
            id: r.id,
            name: r.name,
            status: r.status,
            fileUrl: r.file_url,
            uploadedDate: r.uploaded_date,
            reviewNote: r.review_note,
          })),
        });
      }
      return res.json(allInternDocs);
    }

    // Student
    const result = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [req.user.id]);
    res.json(result.rows.map(r => ({ id: r.id, name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const submitDocument = async (req, res) => {
  try {
    const docName = req.body.docName;
    if (!docName) return res.status(400).json({ error: 'docName is required' });

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      // Actual file upload via multipart
      fileUrl = publicUploadPath('documents', req.file.filename);
      fileName = req.file.originalname;
    } else if (req.body.fileData) {
      // Base64 fallback
      const ext = req.body.fileName ? path.extname(req.body.fileName) : '.pdf';
      const fname = `${Date.now()}${ext}`;
      const base64 = req.body.fileData.includes(',') ? req.body.fileData.split(',')[1] : req.body.fileData;
      fileUrl = await require('../utils/storage').saveBuffer('documents', fname, Buffer.from(base64, 'base64'));
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
};

const reviewDocument = async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') return res.status(403).json({ error: 'Coordinator only' });
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
};

const getGotenbergUrl = () => {
  let raw = (process.env.GOTENBERG_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
  if (raw && !/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  return raw;
};

let lastGotenbergWarmup = 0;
const warmUpGotenberg = () => {
  if (!process.env.GOTENBERG_URL) return;
  const now = Date.now();
  if (now - lastGotenbergWarmup < 60_000) return;
  lastGotenbergWarmup = now;
  const url = getGotenbergUrl();
  fetch(`${url}/health`, { signal: AbortSignal.timeout(30_000) }).catch(() => { });
};

const getSofficeCmd = () => {
  if (process.platform === 'win32') {
    const defaultWinPath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    if (fs.existsSync(defaultWinPath)) return defaultWinPath;
    const win32Path = 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe';
    if (fs.existsSync(win32Path)) return win32Path;
    return 'soffice.exe';
  }
  return 'soffice';
};

const convertWithGotenberg = async (docxBuffer) => {
  const gotenbergUrl = getGotenbergUrl();
  const maxAttempts = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const form = new FormData();
      form.append(
        'files',
        new Blob([docxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        'journal.docx'
      );

      const res = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(90_000),
      });

      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }

      const detail = await res.text().catch(() => '');
      lastErr = new Error(`Gotenberg ${res.status}: ${detail.slice(0, 300)}`);

      // Retry on Render cold-start / gateway statuses (502, 503, 504, 429, 500)
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
        console.warn(`Gotenberg attempt ${attempt} returned ${res.status}, waiting before retry...`);
        await fetch(`${gotenbergUrl}/health`, { signal: AbortSignal.timeout(15_000) }).catch(() => { });
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw lastErr;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        console.warn(`Gotenberg attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
    }
  }

  throw lastErr || new Error('Gotenberg conversion failed');
};

const convertWithLibreOffice = (inputPath, tmpDir, profileDir) =>
  new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const profileUri = 'file:///' + profileDir.replace(/\\/g, '/').replace(/^\/+/, '');
    execFile(
      getSofficeCmd(),
      [
        `-env:UserInstallation=${profileUri}`,
        '--headless',
        '--nologo',
        '--nodefault',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        inputPath,
        '--outdir',
        tmpDir,
      ],
      { timeout: 90_000 },
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

const convertDocxToPdf = async (req, res) => {
  let inputPath = null;
  let pdfPath = null;
  let profileDir = null;
  const tmpDir = path.join(__dirname, '../tmp');

  try {
    let docxBuffer = null;
    if (req.file && req.file.buffer) {
      docxBuffer = req.file.buffer;
    } else if (req.body && req.body.docxBase64) {
      const base64 = req.body.docxBase64.includes(',')
        ? req.body.docxBase64.split(',')[1]
        : req.body.docxBase64;
      docxBuffer = Buffer.from(base64, 'base64');
    } else {
      return res.status(400).json({ error: 'No DOCX file provided for conversion' });
    }

    const outputFilename = (req.file?.originalname || 'document.docx').replace(/\.docx$/i, '.pdf');

    if (process.env.GOTENBERG_URL) {
      try {
        const pdfBuffer = await convertWithGotenberg(docxBuffer);
        console.log(`PDF converted via Gotenberg (${getGotenbergUrl()})`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
        return res.send(pdfBuffer);
      } catch (gotenbergErr) {
        console.warn('Gotenberg conversion failed, trying local LibreOffice:', gotenbergErr.message);
      }
    }

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inputPath = path.join(tmpDir, `convert_${fileId}.docx`);
    profileDir = path.join(tmpDir, `lo_profile_${fileId}`);
    fs.writeFileSync(inputPath, docxBuffer);

    await convertWithLibreOffice(inputPath, tmpDir, profileDir);

    pdfPath = path.join(tmpDir, `convert_${fileId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF output file was not generated by LibreOffice converter');
    }

    console.log('PDF converted via local LibreOffice');
    const pdfBuffer = fs.readFileSync(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('DOCX to PDF conversion error:', err);
    res.status(500).json({ error: 'Failed to convert DOCX to PDF: ' + err.message });
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      if (profileDir && fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup error
    }
  }
};

module.exports = {
  getDocuments,
  submitDocument,
  reviewDocument,
  convertDocxToPdf
};

