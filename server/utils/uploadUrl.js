/** Public path served by Express static + Vite/ngrok proxy (no localhost host). */
function publicUploadPath(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

/** Normalize legacy absolute URLs stored in the DB. */
function normalizeUploadUrl(url) {
  if (!url) return null;
  const match = String(url).match(/\/uploads\/[^?#]+/);
  return match ? match[0] : url;
}

module.exports = { publicUploadPath, normalizeUploadUrl };
