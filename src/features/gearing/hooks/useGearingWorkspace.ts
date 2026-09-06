/** Own the gearing model lifecycle, draft persistence, imports, and cancellation. */
import { useCallback, useEffect, useState } from "react";
import { reaction } from "mobx";
import { destroy, getSnapshot, isAlive, onSnapshot } from "mobx-state-tree";
import { Store, type IStore } from "../models/index.ts";
import { initializeGearData, loadGearDataOfGearId } from "../api/gearData.ts";
import {
  readGearingDraft,
  saveGearingDraft,
  restoreGearingPreferences,
  clearGearingDraft,
} from "../utils/storage.ts";
import { importGearingShare } from "../utils/sharing.ts";
import { cancelAllGearingOptimizations } from "../api/optimization.ts";
import type { GearId } from "../utils/game.ts";

export function useGearingWorkspace(dark: boolean) {
  const [store, setStore] = useState<IStore>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false,
      instance: IStore | undefined;
    const cleanup: (() => void)[] = [];
    const start = async () => {
      try {
        initializeGearData();
        const saved = readGearingDraft();
        await Promise.all(
          Object.values(saved?.snapshot.equippedGears ?? {})
            .filter(Boolean)
            .map((id) => loadGearDataOfGearId(Math.abs(Number(id)) as GearId)),
        );
        if (disposed) return;
        instance = Store.create(saved?.snapshot);
        restoreGearingPreferences(instance, saved);
        const current = instance;
        const save = () => {
          try {
            saveGearingDraft(current);
          } catch {
            setError("配装保存失败，请检查本地存储空间。");
          }
        };
        cleanup.push(onSnapshot(current, save));
        cleanup.push(
          reaction(
            () =>
              JSON.stringify({
                setting: getSnapshot(current.setting),
                promotion: getSnapshot(current.promotion),
                clan: current.clan,
                tiers: current.tiersShown,
              }),
            save,
          ),
        );
        window.addEventListener("pagehide", save);
        cleanup.push(() => window.removeEventListener("pagehide", save));
        setStore(current);
        setError("");
      } catch (reason) {
        console.error("Could not initialize gearing.", reason);
        if (!disposed)
          setError("配装草稿或装备数据加载失败，可以清除配装草稿后重试。");
      }
    };
    void start();
    return () => {
      disposed = true;
      cleanup.forEach((stop) => stop());
      cancelAllGearingOptimizations();
      if (instance && isAlive(instance)) {
        try {
          saveGearingDraft(instance);
        } catch {
          /* Preserve the existing draft when storage is unavailable. */
        }
        destroy(instance);
      }
    };
  }, [attempt]);
  useEffect(() => {
    if (store && isAlive(store))
      store.setting.setAppTheme(dark ? "dark" : "light");
  }, [dark, store]);
  const importShare = useCallback(
    async (input: string) => {
      if (!store) throw new Error("The gearing workspace is not ready.");
      cancelAllGearingOptimizations();
      await importGearingShare(store, input);
    },
    [store],
  );
  const reset = () => {
    clearGearingDraft();
    setStore(undefined);
    setAttempt((value) => value + 1);
  };
  return { store, error, importShare, reset };
}
