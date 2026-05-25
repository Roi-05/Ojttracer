/** Use same-origin /uploads paths so ngrok/HTTPS dev does not hit loopback CORS blocks. */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  const match = url.match(/\/uploads\/[^?#]+/);
  return match ? match[0] : url;
}
