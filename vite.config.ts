/** Configure React development without watching native binaries or build workspaces. */
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const debugBuild =
    command === "serve" || process.env.TAURI_ENV_DEBUG === "true";
  return {
    plugins: [
      react(),
      babel({
        presets: [reactCompilerPreset()],
        exclude: [/[/\\]node_modules[/\\]/, /\0rolldown\/runtime\.js/],
      }),
    ],
    define: {
      __DEBUG_BUILD__: JSON.stringify(debugBuild),
    },
    build: {
      rollupOptions: {
        output: {
          // Match the stable bundle naming convention used by Webpack builds.
          entryFileNames: "assets/chunk-[hash].js",
          chunkFileNames: (chunkInfo) =>
            `assets/${chunkInfo.name === "vendor" ? "vendor" : "chunk"}-[hash].js`,
          manualChunks: (id) =>
            id.includes("node_modules") ? "vendor" : undefined,
        },
      },
    },
    // Keep Vite's development server stable for Tauri's native window.
    clearScreen: false,
    server: {
      // LAN binding lets a phone load the dedicated mobile entry during Debug sessions.
      host: process.env.TAURI_DEV_HOST || "0.0.0.0",
      port: 1420,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:1421",
          changeOrigin: true,
        },
      },
      watch: {
        // Tauri watches Rust itself; Vite must not open DLLs held by the native app.
        ignored: ["**/src-tauri/**", "**/game-bridge/**", "**/.release/**"],
      },
    },
  };
});
