/** Build the offline duty-name dictionary used by the Mentor record ledger. */
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
if (nameIndex < 0) throw new Error("Duty sheet columns are missing.");
const duties = Object.fromEntries(
  rows
    .slice(3)
    .filter((row) => row[nameIndex] && Number(row[0]) > 0)
    .map((row) => [row[0], row[nameIndex]]),
);
await mkdir("src/features/mentor", { recursive: true });
await writeFile(
  "src/features/mentor/dutyNames.json",
  `${JSON.stringify(duties)}\n`,
);
console.log(`Wrote ${Object.keys(duties).length} duty names.`);
