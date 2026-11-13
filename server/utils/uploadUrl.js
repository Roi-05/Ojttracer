const { publicUrl } = require('./storage');

/** Public URL for a stored file (Supabase Storage in prod, /uploads/... locally). */
function publicUploadPath(folder, filename) {
  return publicUrl(folder, filename);
}

/** Normalize legacy absolute URLs stored in the DB. */
function normalizeUploadUrl(url) {
  if (!url) return null;
  const s = String(url);
  if (/\/storage\/v1\/object\/public\//.test(s)) return s; // Supabase Storage URL: keep as-is
  const match = s.match(/\/uploads\/[^?#]+/);
  return match ? match[0] : url;
}

module.exports = { publicUploadPath, normalizeUploadUrl };
