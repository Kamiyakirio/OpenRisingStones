/** List the fishing spots in one selected map. */

import { CaretRight } from "@phosphor-icons/react";
import type { FishingMapGroup, FishingSpotGroup } from "../utils/workspace";
export function FishingSpotList({
  map,
  onOpen,
}: {
  map: FishingMapGroup;
  onOpen: (spot: FishingSpotGroup) => void;
}) {
  return (
    <div className="fish-spot-list max-h-75 overflow-auto border-t border-solid border-line">
      {map.spots.map((spot) => (
        <button
          className="fish-spot-link grid min-h-13 w-full grid-cols-[minmax(0,_1fr)_auto_16px] items-center gap-3 rounded-none border-0 border-b border-solid border-line bg-transparent px-1 py-2.5 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
          id={`fish-spot-${map.id}-${spot.id}`}
          key={spot.id}
          type="button"
          onClick={() => onOpen(spot)}
        >
          <strong className="min-w-0 font-semibold">
            {spot.name || "钓场待补"}
          </strong>
          <span className="text-[13px] whitespace-nowrap text-muted">
            {spot.fish.length === spot.caught
              ? "已齐"
              : `${spot.fish.length - spot.caught} 未记录`}
          </span>
          <CaretRight className="h-4 w-4 text-muted" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
