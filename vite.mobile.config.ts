/** Builds the phone UI as standard Vite assets for the Rust release server. */
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      exclude: [/[/\\]node_modules[/\\]/, /\0rolldown\/runtime\.js/],
    }),
  ],
  build: {
    emptyOutDir: true,
    outDir: "dist-mobile",
    rollupOptions: {
      input: "mobile.html",
    },
  },
});
