/** Resolves native catch item IDs against the same offline catalog as the database. */
import { useEffect, useState } from "react";
import { FishIcon } from "../components/FishIcon";
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
      className="timer-catch mx-0 my-3 flex items-center gap-2.5 border-t border-solid border-line pt-2.5"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <FishIcon
        size="catch"
        key={itemId}
        fish={{
          icon: fish?.icon ?? "",
        }}
      />
      <div className="min-w-0" key={sequence}>
        <span className="mb-[3px] block text-[11px] text-muted">刚刚钓获</span>
        <strong className="[overflow-wrap:anywhere]">
          {fish?.name ?? `物品 #${itemId}`}
        </strong>
      </div>
    </div>
  );
}
