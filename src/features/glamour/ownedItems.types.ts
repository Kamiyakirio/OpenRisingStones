/** Frontend contract for the login-bound owned-item cache. */
export type OwnedItemSource =
  "equipped" | "inventory" | "armoury_chest" | "glamour_dresser" | "armoire";

export type OwnedItemRecord = {
  itemId: number;
  sources: Exclude<OwnedItemSource, "armoire">[];
};

export type OwnedItemsSnapshot = {
  schemaVersion: number;
  character: {
    contentId: string;
    characterName: string;
    currentWorldId: number;
    homeWorldId: number;
    currentRegion: string | null;
    homeRegion: string | null;
  };
  capturedAtUnixMs: number;
  items: OwnedItemRecord[];
  inventory: OwnedCacheCoverage;
  armouryChest: OwnedCacheCoverage;
  glamourDresser: OwnedCacheCoverage;
  armoire: {
    cached: boolean;
    mayBeStale: boolean;
    cabinetItemIds: number[];
  };
};

export type OwnedCacheCoverage = {
  loaded: boolean;
  mayBeStale: boolean;
};

export type OwnedItemMatch =
  | {
      kind: "exact" | "same_model";
      ownedItemId: number;
      ownedItemName: string | null;
      sources: OwnedItemSource[];
    }
  | {
      kind: "not_owned" | "checking" | "metadata_unavailable" | "unavailable";
    };
