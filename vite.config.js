import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const normalized = id.replace(/\\/g, "/");
          const pkgPath = normalized.split("/node_modules/")[1] || normalized;
          if (pkgPath.startsWith("react-router-dom/")) return "vendor-router";
          if (pkgPath.startsWith("react-dom/") || pkgPath.startsWith("react/")) return "vendor-react";
          if (pkgPath.startsWith("axios/")) return "vendor-axios";
          if (pkgPath.startsWith("chart.js/") || pkgPath.startsWith("@kurkle/")) return "vendor-charts";
          return "vendor";
        },
      },
    },
  },
})
