import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, Vite corre en :5173 y manda /api y /uploads al servidor Express (:3000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
