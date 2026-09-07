/** Download immutable raw game tables using public feeds and files, without REST API quotas. */
import { load } from "cheerio";
export const sheetNames = [
  "BaseParam",
  "ClassJobCategory",
  "ContentFinderCondition",
  "Item",
  "ItemAction",
  "ItemFood",
  "ItemLevel",
];
const indexRepository = "xivapi/ffxiv-datamining";
const gameRepository = "thewakingsands/ffxiv-datamining-cn";
const lodestoneRepository = "Asvel/ffxiv-lodestone-item-id";
function feedCommit(text) {
  const $ = load(text, { xmlMode: true });
  const entry = $("feed > entry").first();
  const sha = /Commit\/([a-f0-9]{40})$/.exec(
    entry.children("id").text().trim(),
  )?.[1];
  if (!sha)
    throw new Error("Cannot identify a commit in the public release feed.");
  return { sha, message: entry.children("title").text().trim() };
}

export async function downloadText(
  url,
  fetcher = fetch,
  limit = 128 * 1024 * 1024,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher(url, {
      headers: { "User-Agent": "OpenRisingStones-gearing-data" },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1)),
        );
        continue;
      }
      throw new Error(`Download failed (${response.status}): ${url}`);
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw new Error(`Download exceeds size limit: ${url}`);
      chunks.push(chunk);
    }
    if (!size) throw new Error(`Empty download: ${url}`);
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  }
}

export async function downloadInputs({
  ref = "master",
  lodestoneRef = "master",
  fetcher = fetch,
  progress = () => {},
} = {}) {
  const release = feedCommit(
    await downloadText(
      `https://github.com/${indexRepository}/commits/${encodeURIComponent(ref)}/csv/cn.atom`,
      fetcher,
      8 * 1024 * 1024,
    ),
  );
  const patch = /\b(\d+\.\d+)(h\d+)?\b/.exec(release.message);
  if (!patch)
    throw new Error("Cannot identify the published Chinese game-data release.");
  const modules = await downloadText(
    `https://raw.githubusercontent.com/${indexRepository}/${release.sha}/.gitmodules`,
    fetcher,
    1024 * 1024,
  );
  const cnModule = modules
    .split(/^\[submodule /m)
    .find((section) => /^\s*path\s*=\s*csv\/cn\s*$/m.test(section));
  const repositoryUrl = /^\s*url\s*=\s*(\S+)\s*$/m
    .exec(cnModule ?? "")?.[1]
    ?.replace(/\.git$/, "");
  if (repositoryUrl !== `https://github.com/${gameRepository}`)
    throw new Error(
      "The Chinese CSV source layout changed; review the download configuration.",
    );
  // Read the pointer from the release patch; no clone or Git submodule is created.
  const diff = await downloadText(
    `https://github.com/${indexRepository}/commit/${release.sha}.patch`,
    fetcher,
    32 * 1024 * 1024,
  );
  const cnDiff = diff
    .split(/^(?=diff --git )/m)
    .find((section) => section.startsWith("diff --git a/csv/cn b/csv/cn\n"));
  const cnCommit = /^\+Subproject commit ([a-f0-9]{40})$/m.exec(
    cnDiff ?? "",
  )?.[1];
  if (!cnCommit)
    throw new Error(
      "Cannot resolve the Chinese CSV revision from the release patch.",
    );
  const lodestone = feedCommit(
    await downloadText(
      `https://github.com/${lodestoneRepository}/commits/${encodeURIComponent(lodestoneRef)}.atom`,
      fetcher,
      8 * 1024 * 1024,
    ),
  );
  const sources = {
    game: {
      repository: gameRepository,
      commit: cnCommit,
      release: patch[0],
      version: patch[1],
      indexRepository,
      indexCommit: release.sha,
    },
    lodestone: { repository: lodestoneRepository, commit: lodestone.sha },
    baseParam: {
      repository: indexRepository,
      commit: release.sha,
      path: "csv/en/BaseParam.csv",
    },
  };
  progress(
    `Downloading Chinese game data ${patch[0]} (${cnCommit.slice(0, 7)}).`,
  );
  const files = Object.fromEntries(
    sheetNames.map((name) => [
      `${name}.csv`,
      `https://raw.githubusercontent.com/${gameRepository}/${cnCommit}/${name}.csv`,
    ]),
  );
  // The locale-independent cap table uses the canonical schema, avoiding shifted legacy CN headers.
  files["BaseParam.csv"] =
    `https://raw.githubusercontent.com/${indexRepository}/${release.sha}/csv/en/BaseParam.csv`;
  files["lodestone-item-id.txt"] =
    `https://raw.githubusercontent.com/${lodestoneRepository}/${lodestone.sha}/lodestone-item-id.txt`;
  const entries = Object.entries(files),
    raw = {};
  // Bound simultaneous transfers and wait for the entire batch before converting anything.
  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(async ([name, url]) => [
        name,
        await downloadText(url, fetcher),
      ]),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    for (const result of results) {
      const [name, text] = result.value;
      raw[name] = text;
      progress(`Downloaded ${name}.`);
    }
  }
  return { raw, sources, gameVersion: patch[1] };
}
