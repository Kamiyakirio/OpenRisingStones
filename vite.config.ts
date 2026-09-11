/** Configure React development without watching native binaries or build workspaces. */
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      exclude: [/[/\\]node_modules[/\\]/, /\0rolldown\/runtime\.js/],
    }),
  ],
  // Keep Vite's development server stable for Tauri's native window.
  clearScreen: false,
  server: {
    host: process.env.TAURI_DEV_HOST || false,
    port: 1420,
    strictPort: true,
    watch: {
      // Tauri watches Rust itself; Vite must not open DLLs held by the native app.
      ignored: ["**/src-tauri/**", "**/game-bridge/**", "**/.release/**"],
    },
  },
});
