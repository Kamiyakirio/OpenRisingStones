/** Frontend-owned immutable item data. Browsing never crosses the native boundary. */
import type { Bootstrap, Item, Query } from "./types";
import type { Definition, GameRules, GameTables } from "./calculation.types";
export interface GearingDataset {
  manifest: Bootstrap["manifest"] & { formatVersion: 3 };
  items: Item[];
  sources: Bootstrap["sources"];
  rules: GameRules & {
    jobOrder: string[];
    statNames: Bootstrap["statNames"];
    materiaNames: Bootstrap["materiaNames"];
    materiaGradeNames: string[];
    materias: Bootstrap["materias"];
    clans: string[];
    [key: string]: unknown;
  };
  tables: GameTables & {
    syncLevels: Bootstrap["syncLevels"];
    [key: string]: unknown;
  };
}
export class ItemCatalog {
  private byId = new Map<number, Item>();
  private byJob = new Map<string, Item[]>();
  constructor(privateData: GearingDataset) {
    this.data = privateData;
    if (
      privateData.manifest?.formatVersion !== 3 ||
      !Array.isArray(privateData.items) ||
      !privateData.rules?.jobSchemas ||
      !privateData.tables
    )
      throw new Error("Unsupported gearing data asset.");
    for (const item of privateData.items) {
      if (
        !Number.isSafeInteger(item.id) ||
        item.id <= 0 ||
        this.byId.has(item.id) ||
        !Array.isArray(item.jobs)
      )
        throw new Error("Invalid or duplicate gearing item.");
      this.byId.set(item.id, item);
      for (const job of item.jobs) {
        let items = this.byJob.get(job);
        if (!items) {
          items = [];
          this.byJob.set(job, items);
        }
        items.push(item);
      }
    }
  }
  private readonly data: GearingDataset;
  bootstrap(): Bootstrap {
    const { rules, tables, manifest, sources } = this.data;
    return {
      manifest,
      sources,
      statNames: rules.statNames,
      materiaNames: rules.materiaNames,
      materiaGradeNames: rules.materiaGradeNames,
      materias: rules.materias,
      clans: rules.clans,
      jobLevels: Object.keys(rules.jobLevelModifiers).sort(
        (a, b) => Number(a) - Number(b),
      ),
      syncLevels: tables.syncLevels,
      jobs: rules.jobOrder.map((id) => ({
        ...rules.jobSchemas[id],
        id,
        combat: !!rules.jobSchemas[id].mainStat,
      })),
    };
  }
  items(ids: number[]): Item[] {
    return ids.map((id) => {
      const item = this.byId.get(id);
      if (!item) throw new Error(`Missing gearing item: ${id}`);
      return item;
    });
  }
  /** Source facets cover the whole eligible scope, not just the current result page. */
  sourceIds(
    query: Pick<Query, "job" | "minLevel" | "maxLevel"> &
      Partial<Pick<Query, "slot" | "hideObsolete" | "search">>,
  ): string[] {
    const slot = query.slot === "ringRight" ? "ringLeft" : query.slot;
    return [
      ...new Set(
        (this.byJob.get(query.job) ?? [])
          .filter(
            (item) =>
              (slot ? item.slotKey === slot : item.kind === "equipment") &&
              item.level >= query.minLevel &&
              item.level <= query.maxLevel &&
              (!query.search || item.name.includes(query.search)) &&
              (!query.hideObsolete || !item.obsolete),
          )
          .flatMap((item) => (item.sourceId ? [item.sourceId] : [])),
      ),
    ];
  }
  query(query: Query): {
    items: Item[];
    total: number;
    availableSourceIds: string[];
  } {
    if (!this.data.rules.jobSchemas[query.job])
      throw new Error("Unknown gearing job.");
    const slot = query.slot === "ringRight" ? "ringLeft" : query.slot;
    const rows = (this.byJob.get(query.job) ?? []).filter(
      (item) =>
        item.slotKey === slot &&
        item.level >= query.minLevel &&
        item.level <= query.maxLevel &&
        item.name.includes(query.search) &&
        (!query.hideObsolete || !item.obsolete) &&
        (!query.sourceIds.length ||
          (!!item.sourceId && query.sourceIds.includes(item.sourceId))),
    );
    const direction = query.sortDirection === "asc" ? -1 : 1;
    rows.sort(
      (a, b) =>
        direction *
          ((query.sortStat
            ? (b.stats[query.sortStat] ?? 0) - (a.stats[query.sortStat] ?? 0)
            : 0) || b.level - a.level) || a.id - b.id,
    );
    return {
      items: rows.slice(query.offset, query.offset + query.limit),
      total: rows.length,
      availableSourceIds: this.sourceIds(query),
    };
  }
  get rules() {
    return this.data.rules;
  }
  get tables() {
    return this.data.tables;
  }
  get manifest() {
    return this.data.manifest;
  }
  item(id: number): Definition {
    return this.items([id])[0] as Definition;
  }
}
let catalog: Promise<ItemCatalog> | undefined;
export function loadItemCatalog(): Promise<ItemCatalog> {
  // Vite copies this JSON as a data asset; it is not parsed or split into JavaScript modules.
  catalog ??= fetch(new URL("../data/generated/catalog.json", import.meta.url))
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Cannot load gearing data: HTTP ${response.status}`);
      return new ItemCatalog((await response.json()) as GearingDataset);
    })
    .catch((error) => {
      catalog = undefined;
      throw error;
    });
  return catalog;
}
