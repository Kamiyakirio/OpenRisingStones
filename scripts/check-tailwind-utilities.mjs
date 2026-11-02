/** Reject broken or ambiguous arbitrary utilities before Tailwind silently emits invalid CSS. */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const closingPairs = { "]": "[", ")": "(", "}": "{" };

/** CSS functions and quoted values must stay intact inside an arbitrary utility. */
export function hasBalancedUtilityValue(candidate) {
  const stack = [];
  let quote = "";
  for (let index = 0; index < candidate.length; index++) {
    const character = candidate[index];
    if (character === "\\") {
      index++;
      continue;
    }
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if ("[({".includes(character)) {
      stack.push(character);
    } else if (Object.hasOwn(closingPairs, character)) {
      if (stack.pop() !== closingPairs[character]) return false;
    }
  }
  return stack.length === 0 && quote === "";
}

/** Inspect decoded strings so JSX, clsx presets, and template branches share one check. */
export function findBrokenUtilities(fileName, content) {
  const source = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const findings = [];
  function visit(node) {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      for (const candidate of node.text.split(/\s+/)) {
        // Ignore bracket syntax in GraphQL queries and prose; only inspect utility-shaped tokens.
        if (!/(?:^|:)[\w!-]+-\[|^\[(?:&|@|[a-z-]+:)/.test(candidate)) continue;
        // Arbitrary content sets generated text; alignment and unitless font sizes need explicit utilities.
        const ambiguousAlignment =
          !/(?:^|:)(?:before|after):/.test(candidate) &&
          /(?:^|:)content-\[(?:center|normal|start|end|stretch|space-between|space-around|space-evenly)\]$/.test(
            candidate,
          );
        const invalidValue =
          /(?:^|:)text-\[\d+(?:\.\d+)?\]$/.test(candidate) ||
          /-\[(?:\+|[^\[\]]*,)\]$/.test(candidate);
        if (
          !hasBalancedUtilityValue(candidate) ||
          ambiguousAlignment ||
          invalidValue
        ) {
          findings.push({
            line:
              source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            candidate,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings;
}

function checkDirectory(directory) {
  let failures = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      failures += checkDirectory(path);
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      for (const finding of findBrokenUtilities(
        path,
        readFileSync(path, "utf8"),
      )) {
        console.error(
          `${path}:${finding.line}: Broken arbitrary utility: ${finding.candidate}`,
        );
        failures++;
      }
    }
  }
  return failures;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const failures = checkDirectory(
    fileURLToPath(new URL("../src", import.meta.url)),
  );
  if (failures) process.exitCode = 1;
  else console.log("Arbitrary utility syntax checks passed across src.");
}
