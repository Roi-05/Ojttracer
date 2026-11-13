const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

// Supabase Storage is used when URL + service key are set; otherwise local disk (dev).
const enabled = Boolean(SUPABASE_URL && SERVICE_KEY);

// Supports both legacy JWT service_role keys (eyJ...) and new secret keys (sb_secret_...)
const authHeaders = () => ({
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
});

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const mimeFor = (name) => MIME[path.extname(name).toLowerCase()] || 'application/octet-stream';

/** URL stored in the DB / sent to the browser. */
function publicUrl(folder, filename) {
  return enabled
    ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${folder}/${filename}`
    : `/uploads/${folder}/${filename}`;
}

/** Save a Buffer; returns the public URL. */
async function saveBuffer(folder, filename, buffer) {
  if (!enabled) {
    const dir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
    return publicUrl(folder, filename);
  }
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${folder}/${filename}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': mimeFor(filename),
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
  return publicUrl(folder, filename);
}

/** Delete a previously stored file by the URL we returned. Never throws. */
async function removeByUrl(url) {
  if (!url) return;
  try {
    if (enabled) {
      const marker = `/object/public/${BUCKET}/`;
      const i = String(url).indexOf(marker);
      if (i === -1) return;
      const key = url.slice(i + marker.length);
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [key] }),
      });
    } else {
      const m = String(url).match(/\/uploads\/([^?#]+)/);
      if (!m) return;
      const full = path.join(UPLOADS_DIR, m[1]);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  } catch (err) {
    console.error('[storage] delete failed:', err.message);
  }
}

/** Multer storage engine that streams the file straight to Supabase Storage. */
function supabaseMulterStorage(folder) {
  return {
    _handleFile(req, file, cb) {
      const chunks = [];
      file.stream.on('data', (c) => chunks.push(c));
      file.stream.on('error', cb);
      file.stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        saveBuffer(folder, filename, buffer)
          .then(() => cb(null, { filename, size: buffer.length }))
          .catch(cb);
      });
    },
    _removeFile(req, file, cb) { cb(null); },
  };
}

module.exports = { enabled, UPLOADS_DIR, publicUrl, saveBuffer, removeByUrl, supabaseMulterStorage };
