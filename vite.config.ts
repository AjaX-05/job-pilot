import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true, // Optional but useful
    open: false, // ✅ prevent auto-browser open
  },
});
