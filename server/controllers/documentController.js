const db = require('../db');
const { publicUploadPath } = require('../utils/uploadUrl');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

const getDocuments = async (req, res) => {
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
      const profiles = await db.query(`
        SELECT p.id, p.name, s.student_id as student_no, s.section, d.company_name
        FROM public.profiles p 
        LEFT JOIN public.students s ON s.user_id = p.id 
        LEFT JOIN public.deployments d ON d.student_id = p.id
        WHERE p.role = 'student'
      `);
      const all = [];
      for (const prof of profiles.rows) {
        const docsRes = await db.query(`SELECT * FROM public.documents WHERE student_id = $1`, [prof.id]);
        all.push({ 
          studentId: prof.id, 
          studentName: prof.name, 
          studentNo: prof.student_no || '—', 
          section: prof.section || '—', 
          isDeployed: !!prof.company_name,
          assignedCompany: prof.company_name || null,
          docs: docsRes.rows.map(r => ({ name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note })) 
        });
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
      const docDir = path.join(UPLOADS_DIR, 'documents');
      if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
      const base64 = req.body.fileData.includes(',') ? req.body.fileData.split(',')[1] : req.body.fileData;
      fs.writeFileSync(path.join(docDir, fname), Buffer.from(base64, 'base64'));
      fileUrl = publicUploadPath('documents', fname);
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
};

const GOTENBERG_URL = (process.env.GOTENBERG_URL || 'http://localhost:3001').replace(/\/$/, '');

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
  const form = new FormData();
  form.append(
    'files',
    new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'journal.docx'
  );

  const res = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gotenberg ${res.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await res.arrayBuffer());
};

const convertWithLibreOffice = (inputPath, tmpDir) =>
  new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    execFile(
      getSofficeCmd(),
      ['--headless', '--convert-to', 'pdf', inputPath, '--outdir', tmpDir],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

const convertDocxToPdf = async (req, res) => {
  let inputPath = null;
  let pdfPath = null;
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

    try {
      const pdfBuffer = await convertWithGotenberg(docxBuffer);
      console.log(`Journal PDF converted via Gotenberg (${GOTENBERG_URL})`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Journal.pdf"');
      return res.send(pdfBuffer);
    } catch (gotenbergErr) {
      console.warn('Gotenberg conversion failed, trying local LibreOffice:', gotenbergErr.message);
    }

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inputPath = path.join(tmpDir, `convert_${fileId}.docx`);
    fs.writeFileSync(inputPath, docxBuffer);

    await convertWithLibreOffice(inputPath, tmpDir);

    pdfPath = path.join(tmpDir, `convert_${fileId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF output file was not generated by LibreOffice converter');
    }

    console.log('Journal PDF converted via local LibreOffice');
    const pdfBuffer = fs.readFileSync(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Journal.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('DOCX to PDF conversion error:', err);
    res.status(500).json({ error: 'Failed to convert DOCX to PDF: ' + err.message });
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
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

