/** Build offline duty names and content classification for the Mentor ledger. */
import { mkdir, writeFile } from "node:fs/promises";
import Papa from "papaparse";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { configureSystemProxy } from "./system-proxy.mjs";

const proxy = configureSystemProxy();
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy.proxyUrl));
const source =
  "https://raw.githubusercontent.com/thewakingsands/ffxiv-datamining-cn/master/ContentFinderCondition.csv";
const response = await fetch(source, { signal: AbortSignal.timeout(60000) });
if (!response.ok)
  throw new Error(`Duty sheet request failed: ${response.status}`);
const rows = Papa.parse(await response.text(), { skipEmptyLines: true }).data;
const header = rows[1];
const nameIndex = header.indexOf("Name");
const typeIndex = header.indexOf("ContentType");
const memberIndex = header.indexOf("ContentMemberType");
if ([nameIndex, typeIndex, memberIndex].some((index) => index < 0))
  throw new Error("Duty sheet columns are missing.");
const namedRows = rows
  .slice(3)
  .filter((row) => row[nameIndex] && Number(row[0]) > 0);
const duties = Object.fromEntries(
  namedRows.map((row) => [row[0], row[nameIndex]]),
);
// Tuple fields: ContentType and ContentMemberType, both direct game-sheet IDs.
const types = Object.fromEntries(
  namedRows.map((row) => [
    row[0],
    [Number(row[typeIndex]), Number(row[memberIndex])],
  ]),
);
await mkdir("src/features/mentor/data", { recursive: true });
await writeFile(
  "src/features/mentor/data/dutyNames.json",
  `${JSON.stringify(duties)}\n`,
);
console.log(`Wrote ${Object.keys(duties).length} duty names.`);
await writeFile(
  "src/features/mentor/data/dutyTypes.json",
  `${JSON.stringify(types)}\n`,
);
console.log(`Wrote ${Object.keys(types).length} duty classifications.`);
