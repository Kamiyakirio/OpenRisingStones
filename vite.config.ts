import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  // Keep Vite's development server stable for Tauri's native window.
  clearScreen: false,
  server: {
    host: process.env.TAURI_DEV_HOST || false,
    port: 1420,
    strictPort: true,
  },
});
