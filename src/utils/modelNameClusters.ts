/** Groups role-specific equipment variants when only one known infix differs. */
import type { WikiModelItem } from "../services/wikiApi";

export const MODEL_ROLE_INFIXES = [
  "御敌",
  "制敌",
  "强袭",
  "强攻",
  "游击",
  "精准",
  "治愈",
  "咏咒",
] as const;

export type ModelNameCluster = {
  kind: "cluster";
  key: string;
  label: string;
  prefix: string;
  suffix: string;
  models: WikiModelItem[];
  infixes: string[];
};

export type ModelNameClusterEntry =
  ModelNameCluster | { kind: "item"; model: WikiModelItem };

type ParsedModelName = {
  key: string;
  prefix: string;
  suffix: string;
  infix: string;
};

/** Preserves Wiki order while collapsing only groups with two distinct role infixes. */
export function clusterModelItems(
  models: WikiModelItem[],
): ModelNameClusterEntry[] {
  const parsedByModel = new Map<WikiModelItem, ParsedModelName>();
  const candidates = new Map<string, WikiModelItem[]>();
  models.forEach((model) => {
    const parsed = parseModelName(model.name);
    if (!parsed) return;
    parsedByModel.set(model, parsed);
    candidates.set(parsed.key, [...(candidates.get(parsed.key) ?? []), model]);
  });

  const clusterKeys = new Set(
    [...candidates.entries()]
      .filter(([, groupedModels]) => {
        const infixes = new Set(
          groupedModels.map((model) => parsedByModel.get(model)!.infix),
        );
        return groupedModels.length >= 2 && infixes.size >= 2;
      })
      .map(([key]) => key),
  );
  const emitted = new Set<string>();
  const entries: ModelNameClusterEntry[] = [];
  models.forEach((model) => {
    const parsed = parsedByModel.get(model);
    if (!parsed || !clusterKeys.has(parsed.key)) {
      entries.push({ kind: "item", model });
      return;
    }
    if (emitted.has(parsed.key)) return;
    emitted.add(parsed.key);
    const groupedModels = candidates.get(parsed.key)!;
    entries.push({
      kind: "cluster",
      key: parsed.key,
      label: formatClusterLabel(parsed.prefix, parsed.suffix),
      prefix: parsed.prefix,
      suffix: parsed.suffix,
      models: groupedModels,
      infixes: [
        ...new Set(
          groupedModels.map(
            (groupedModel) => parsedByModel.get(groupedModel)!.infix,
          ),
        ),
      ],
    });
  });
  return entries;
}

function parseModelName(name: string): ParsedModelName | null {
  const matches = MODEL_ROLE_INFIXES.flatMap((infix) => {
    const firstIndex = name.indexOf(infix);
    if (firstIndex < 0) return [];
    if (name.indexOf(infix, firstIndex + infix.length) >= 0) return [];
    return [{ infix, index: firstIndex }];
  });
  if (matches.length !== 1) return null;
  const [{ infix, index }] = matches;
  const prefix = name.slice(0, index);
  const suffix = name.slice(index + infix.length);
  return { key: JSON.stringify([prefix, suffix]), prefix, suffix, infix };
}

function formatClusterLabel(prefix: string, suffix: string) {
  if (prefix && suffix) return `${prefix}系列${suffix}`;
  return `${prefix || suffix || "职业"}系列`;
}
