const DEVICE_TOKEN_KEY = "ojt_registered_device_token";

/**
 * Returns the persistent unique device token for this device/browser.
 * Generates a crypto UUID if none exists.
 */
export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      token = crypto.randomUUID();
    } else {
      token = "dev-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Returns a human-friendly string describing the current device and browser.
 * e.g., "Android - Chrome", "iPhone - Safari", "Windows - Edge"
 */
export function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown Device";

  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Browser";

  // Detect OS
  if (/android/i.test(ua)) os = "Android";
  else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) os = "iOS";
  else if (/Win/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // Detect Browser
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const typeLabel = isMobile ? "Mobile Phone" : "Desktop/Laptop";

  return `${typeLabel} (${os} — ${browser})`;
}
