/** Test-only TS/JSON loader for domain modules; it never loads application entry points. */
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const suffix of [".ts", "/index.ts"]) {
        const candidate = new URL(url.href + suffix);
        if (existsSync(fileURLToPath(candidate)))
          return { url: candidate.href, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts"))
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
        shortCircuit: true,
      };
    if (url.endsWith(".json"))
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")}`,
        shortCircuit: true,
      };
    return next(url, context);
  },
});
