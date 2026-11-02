/** Guard the CSS-function regressions that escaped the utility migration build. */
import assert from "node:assert/strict";
import test from "node:test";
import { findBrokenUtilities } from "../scripts/check-tailwind-utilities.mjs";

test("rejects split clamp and safe-area calc values in utility classes", () => {
  const source = `const broken = "pb-[44px)] px-[4vw,] pt-[clamp(26px,] pb-[calc(0.75rem] pl-[+]";`;
  assert.deepEqual(
    findBrokenUtilities("fixture.tsx", source).map(
      (finding) => finding.candidate,
    ),
    [
      "pb-[44px)]",
      "px-[4vw,]",
      "pt-[clamp(26px,]",
      "pb-[calc(0.75rem]",
      "pl-[+]",
    ],
  );
});

test("accepts intact functions, nested variants, and quoted content", () => {
  const source = `const valid = "p-[clamp(26px,_4vw,_44px)] pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] [@media(pointer:_coarse)]:grid-cols-[44px_minmax(0,_1fr)] before:content-['']";`;
  assert.deepEqual(findBrokenUtilities("fixture.tsx", source), []);
});

test("checks JSX and static template branches as well as shared class presets", () => {
  const source =
    "const view = <main className={`grid ${enabled ? 'block' : 'hidden'} pt-[clamp(26px,]`} />;";
  assert.deepEqual(findBrokenUtilities("fixture.tsx", source), [
    { line: 1, candidate: "pt-[clamp(26px,]" },
  ]);
});

test("rejects alignment and font-size utilities that Tailwind interprets as content or color", () => {
  assert.deepEqual(
    findBrokenUtilities(
      "fixture.tsx",
      'const value = "content-[center] min-[921px]:content-[normal] max-[480px]:text-[0]";',
    ).map((finding) => finding.candidate),
    [
      "content-[center]",
      "min-[921px]:content-[normal]",
      "max-[480px]:text-[0]",
    ],
  );
  assert.deepEqual(
    findBrokenUtilities(
      "fixture.tsx",
      'const value = "content-center content-normal text-[length:0] before:content-[normal]";',
    ),
    [],
  );
});

test("ignores brackets in GraphQL queries and log labels", () => {
  assert.deepEqual(
    findBrokenUtilities(
      "fixture.ts",
      'const query = `items(where:{_or:[ ${filter} ]}){id}`; const label = "[ Ready ]";',
    ),
    [],
  );
});
