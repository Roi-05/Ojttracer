import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

/**
 * figmaAssetFallback
 * ------------------
 * In Figma Make's cloud environment, imports like:
 *   import img from "figma:asset/abc123.png"
 * are resolved by Figma Make's own build pipeline.
 *
 * Locally (VS Code / Vite dev server), that virtual scheme doesn't exist,
 * so we intercept it and return an empty string — the app still renders,
 * images sourced from Figma just won't display.
 */
function figmaAssetFallback(): Plugin {
  return {
    name: "figma-asset-fallback",
    resolveId(id) {
      if (id.startsWith("figma:asset/")) return "\0" + id;
    },
    load(id) {
      if (id.startsWith("\0figma:asset/")) return "export default ''";
    },
  };
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required, do not remove them
    react(),
    tailwindcss(),
    // Handles figma:asset/* imports gracefully in local dev
    figmaAssetFallback(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],

  server: {
    port: 5173,
    open: true,
    allowedHosts: true,
    proxy: {
      // Forward all /api requests to the Express backend and strip the /api prefix
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Forward /uploads (photos) to the backend too
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
