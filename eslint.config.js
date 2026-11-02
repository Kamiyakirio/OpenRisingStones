import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "src-tauri/target", ".cargo-target-*"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\[&{2,}/]",
          message:
            "Use utilities on the owning element instead of repeating & to raise specificity.",
        },
        {
          selector: "TemplateElement[value.raw=/\\[&{2,}/]",
          message:
            "Use utilities on the owning element instead of repeating & to raise specificity.",
        },
        {
          selector:
            "Literal[value=/\\[&_(?:>_)?(?:button|input|select|textarea)(?=[:\\]\\[])/]",
          message:
            "Bind control utilities directly to controls instead of styling them through a parent.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tauri-apps/api/core",
              importNames: ["invoke"],
              message: "Use the shared diagnostics invoke adapter.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/diagnostics/{capture,invoke}.ts"],
    rules: { "no-restricted-imports": "off" },
  },
]);
