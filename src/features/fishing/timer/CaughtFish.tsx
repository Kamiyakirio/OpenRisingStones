/** Resolves native catch item IDs against the same offline catalog as the database. */
import { useEffect, useState } from "react";
import { FishIcon } from "../FishIcon";
import type { Fish, FishCatalog } from "../types";

export function CaughtFish({
  itemId,
  sequence,
}: {
  itemId: number;
  sequence: number;
}) {
  const [catalog, setCatalog] = useState<Fish[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}data/fishing/catalog.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Fish catalog could not be loaded.");
        return response.json() as Promise<FishCatalog>;
      })
      .then((data) => setCatalog(data.fish))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const fish = catalog?.find((entry) => entry.id === itemId);
  return (
    <div
      className="timer-catch"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <FishIcon key={itemId} fish={{ icon: fish?.icon ?? "" }} />
      <div key={sequence}>
        <span>刚刚钓获</span>
        <strong>{fish?.name ?? `物品 #${itemId}`}</strong>
      </div>
    </div>
  );
}
