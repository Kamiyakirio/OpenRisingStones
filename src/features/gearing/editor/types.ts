/** Explicit editor/IPC contracts, independent of generated game tables and store implementations. */
export type Stat =
  | "STR"
  | "DEX"
  | "INT"
  | "MND"
  | "VIT"
  | "CRT"
  | "DHT"
  | "DET"
  | "SKS"
  | "SPS"
  | "TEN"
  | "PIE"
  | "CMS"
  | "CRL"
  | "CP"
  | "GTH"
  | "PCP"
  | "GP"
  | "PDMG"
  | "MDMG"
  | "DLY"
  | "main"
  | "secondary";
export type Stats = Partial<Record<Stat, number>>;
export type Slot =
  | "mainHand"
  | "offHand"
  | "head"
  | "body"
  | "hands"
  | "waist"
  | "legs"
  | "feet"
  | "ears"
  | "neck"
  | "wrists"
  | "ringLeft"
  | "ringRight"
  | "soul";
export type Selection = Slot | "food" | "potion";
export interface Meld {
  stat?: Stat;
  grade?: number;
}
export interface Equipment {
  itemId: number;
  materias: Meld[];
  customStats?: Stats | null;
  equipmentLocked: boolean;
  materiaLocked: boolean;
}
export interface GearsetDocument {
  duplicateToolMateria: boolean;
  formatVersion: 2;
  id: string;
  name: string;
  job: string;
  jobLevel: number;
  clan: number;
  syncLevel: number | null;
  equipment: Partial<Record<Slot, Equipment>>;
  foodId: number | null;
  potionId: number | null;
  alternatives: Partial<Record<Slot, Equipment[]>>;
}
export interface Item {
  lodestoneId?: string;
  iconId?: number;
  id: number;
  name: string;
  level: number;
  slotKey: Selection;
  kind: "equipment" | "food" | "potion";
  stats: Stats;
  jobs: string[];
  sourceId: string | null;
  hq?: boolean;
  rarity?: number;
  customizable?: boolean;
  materiaSlot?: number;
  materiaAdvanced?: boolean;
  obsolete?: boolean;
}
export interface Job {
  id: string;
  name: string;
  stats: Stat[];
  slots: { key: Selection; name: string; uiGroup: string }[];
  defaultItemLevel: [number, number];
  jobLevel: number;
  combat: boolean;
}
export interface Bootstrap {
  manifest: {
    gameVersion: string;
    dataVersion: string;
    parameterVersion: string;
  };
  jobs: Job[];
  sources: { id: string; label: string }[];
  statNames: Record<Stat, string>;
  materiaNames: Partial<Record<Stat, string>>;
  materiaGradeNames: string[];
  materias: Partial<Record<Stat, number[]>>;
  clans: string[];
  jobLevels: string[];
  syncLevels: Record<string, number[]>;
}
export interface Effects {
  damage: number;
  gcd: number;
  crtChance: number;
  crtDamage: number;
  detDamage: number;
  dhtChance: number;
  tenDamage: number;
  tenMitigation: number;
  ssDamage: number;
  hp: number;
  mp: number;
}
export interface Evaluation {
  consumption?: {
    stat: Stat;
    grade: number;
    guaranteed: number;
    expected: number;
    confidence90: number;
    confidence99: number;
  }[];
  stats: Stats;
  baseStats: Stats;
  effects: Effects | null;
  itemLevel: number;
  dataVersion: string;
  slots: Partial<
    Record<
      Selection,
      {
        item: Item;
        stats?: Stats;
        caps?: Stats;
        synced?: boolean;
        allowedGrades?: number[][];
        customRule?: {
          major: number;
          minor: number;
          stats: Stat[];
          family?: string;
        } | null;
      }
    >
  >;
  tiers: Partial<
    Record<Stat, { previous: number | null; next: number | null }>
  >;
  issues: { slot: Selection; itemId?: number; message: string }[];
}
export interface Query {
  job: string;
  slot: Selection;
  minLevel: number;
  maxLevel: number;
  search: string;
  sourceIds: string[];
  hideObsolete: boolean;
  sortStat: Stat | "";
  offset: number;
  limit: number;
}
export interface Conditions {
  kind: "combat" | "production" | "det-dht";
  mode: "all" | "current";
  targetGcd: number;
  exactGcd: boolean;
  speedRange: { min: number; max: number } | null;
  progressionWeeks: number | null;
  minLevel: number;
  maxLevel: number;
  sourceIds: string[];
  excludedItemIds: number[];
  optimizeFood: boolean;
  targets: Stats;
}
export interface Proposal {
  status: "ok" | "unreachable" | "limited" | "cancelled" | "invalid" | "error";
  document?: GearsetDocument;
  evaluation?: Evaluation;
  message?: string;
  reason?: string;
  slot?: Slot;
  provenOptimal?: boolean;
  excludedItems?: number[];
  alternatives?: { document: GearsetDocument; evaluation: Evaluation }[];
  fastestGcd?: number;
}
export interface DocumentSummary {
  id: string;
  name: string;
  job: string;
}
