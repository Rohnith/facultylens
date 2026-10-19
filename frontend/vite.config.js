import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 127.0.0.1, not localhost: the API is bound to IPv4.
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: false },
    },
  },
});
