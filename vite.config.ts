import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import {
  checkGearingData,
  generatedDirectory,
} from "./scripts/gearing/check.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "gearing-data-reload",
      configResolved() {
        checkGearingData();
      },
      configureServer(server) {
        const dataPath = generatedDirectory
          .replaceAll("\\", "/")
          .replace(/\/$/, "");
        let reload: ReturnType<typeof setTimeout> | undefined;
        const onDataChange = (_event: string, file: string) => {
          const path = file.replaceAll("\\", "/");
          // A directory swap may emit only addDir for the root, without events for its files.
          if (path !== dataPath && !path.startsWith(`${dataPath}/`)) return;
          // Atomic imports replace the directory: include add/unlink events and clear all cached modules.
          clearTimeout(reload);
          reload = setTimeout(() => void server.restart(), 150);
        };
        server.watcher.on("all", onDataChange);
        server.httpServer?.once("close", () => {
          clearTimeout(reload);
          server.watcher.off("all", onDataChange);
        });
      },
    },
    babel({
      presets: [reactCompilerPreset()],
      exclude: [
        /[/\\]node_modules[/\\]/,
        /\0rolldown\/runtime\.js/,
        /[/\\]gearing[/\\]/,
      ],
    }),
  ],
  // Keep Vite's development server stable for Tauri's native window.
  clearScreen: false,
  server: {
    host: process.env.TAURI_DEV_HOST || false,
    port: 1420,
    strictPort: true,
  },
});
