/** Use same-origin /uploads paths so ngrok/HTTPS dev does not hit loopback CORS blocks. */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  // Keep Supabase Storage URLs (or any external non-localhost https URL) intact!
  if (/\/storage\/v1\/object\/public\//.test(url) || (/^https?:\/\//i.test(url) && !/localhost|127\.0\.0\.1/.test(url))) {
    return url;
  }
  const match = url.match(/\/uploads\/[^?#]+/);
  return match ? match[0] : url;
}
