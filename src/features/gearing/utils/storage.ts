/** Host-owned snapshots and preferences; imported models never access storage. */
import { getSnapshot, applySnapshot, type SnapshotOut } from "mobx-state-tree";
import type { IStore } from "../models/index.ts";
import manifest from "../data/generated/manifest.json";

const key = "open-rising-stones.gearing.v1";
type Saved = {
  version: 1;
  dataVersion: string;
  snapshot: SnapshotOut<IStore>;
  setting: unknown;
  promotion: unknown;
  clan: number;
  tiersShown: boolean;
};
export function readGearingDraft(): Saved | undefined {
  const text = localStorage.getItem(key);
  if (!text) return;
  const data = JSON.parse(text) as Saved;
  if (data.version !== 1 || !data.snapshot || typeof data.snapshot !== "object")
    throw new Error("Unsupported gearing draft format.");
  return data;
}
export function saveGearingDraft(store: IStore) {
  if (store.job === undefined || store.isViewing) return;
  const saved: Saved = {
    version: 1,
    dataVersion: manifest.dataVersion,
    snapshot: getSnapshot(store),
    setting: getSnapshot(store.setting),
    promotion: getSnapshot(store.promotion),
    clan: store.clan,
    tiersShown: store.tiersShown,
  };
  localStorage.setItem(key, JSON.stringify(saved));
}
export function restoreGearingPreferences(store: IStore, saved?: Saved) {
  if (!saved) return;
  applySnapshot(
    store.setting,
    saved.setting as SnapshotOut<typeof store.setting>,
  );
  applySnapshot(
    store.promotion,
    saved.promotion as SnapshotOut<typeof store.promotion>,
  );
  store.setClan(saved.clan);
  if (store.tiersShown !== saved.tiersShown) store.toggleTiersShown();
}
export function clearGearingDraft() {
  localStorage.removeItem(key);
}
