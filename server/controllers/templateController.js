const db = require('../db');
const { publicUploadPath, normalizeUploadUrl } = require('../utils/uploadUrl');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

const getTemplates = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM public.templates ORDER BY name`);
    res.json(result.rows.map(r => ({ docSlug: r.doc_slug, name: r.name, fileUrl: r.file_url, size: r.size, uploadedDate: r.uploaded_date })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadTemplate = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const docName = req.body.docName;
    if (!docName) return res.status(400).json({ error: 'docName is required' });

    let fileUrl = null;
    let fileSize = '—';

    if (req.file) {
      fileUrl = publicUploadPath('templates', req.file.filename);
      fileSize = `${(req.file.size / 1024).toFixed(0)} KB`;
    } else if (req.body.fileData) {
      const ext = req.body.fileName ? path.extname(req.body.fileName) : '.pdf';
      const fname = `${Date.now()}${ext}`;
      const tplDir = path.join(UPLOADS_DIR, 'templates');
      if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });
      const base64 = req.body.fileData.includes(',') ? req.body.fileData.split(',')[1] : req.body.fileData;
      const buf = Buffer.from(base64, 'base64');
      fs.writeFileSync(path.join(tplDir, fname), buf);
      fileUrl = publicUploadPath('templates', fname);
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
};

const deleteTemplate = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const result = await db.query(`DELETE FROM public.templates WHERE doc_slug=$1 RETURNING file_url`, [req.params.slug]);
    const row = result.rows[0];
    if (row?.file_url) {
      const rel = normalizeUploadUrl(row.file_url)?.replace(/^\/uploads\//, '') || '';
      const fullPath = path.join(UPLOADS_DIR, rel);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTemplates,
  uploadTemplate,
  deleteTemplate
};
