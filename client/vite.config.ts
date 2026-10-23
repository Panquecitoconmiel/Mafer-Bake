import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API = process.env.VITE_API_PROXY ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En desarrollo, la API y las imágenes subidas se sirven desde el mismo origen (cookies sin CORS).
    proxy: {
      "/api": { target: API, changeOrigin: false },
      "/uploads": { target: API, changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: API, changeOrigin: false },
      "/uploads": { target: API, changeOrigin: false },
    },
  },
});
