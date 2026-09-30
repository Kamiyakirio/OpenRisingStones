/** List the fishing spots in one selected map. */
import { CaretRight } from "@phosphor-icons/react";
import type { FishingMapGroup, FishingSpotGroup } from "./workspace";

export function FishingSpotList({
  map,
  onOpen,
}: {
  map: FishingMapGroup;
  onOpen: (spot: FishingSpotGroup) => void;
}) {
  return (
    <div className="fish-spot-list">
      {map.spots.map((spot) => (
        <button
          className="fish-spot-link"
          id={`fish-spot-${map.id}-${spot.id}`}
          key={spot.id}
          type="button"
          onClick={() => onOpen(spot)}
        >
          <strong>{spot.name || "钓场待补"}</strong>
          <span>
            {spot.fish.length === spot.caught
              ? "已齐"
              : `${spot.fish.length - spot.caught} 未记录`}
          </span>
          <CaretRight aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
