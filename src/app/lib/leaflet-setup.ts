/**
 * leaflet-setup.ts
 * Fixes the missing default marker icon issue in Vite/Webpack bundled projects.
 * Import this once before rendering any Leaflet map.
 * Uses URL strings directly to avoid TypeScript PNG module resolution issues.
 */
import L from 'leaflet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});
