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
    <div className="fish-spot-list border-t border-solid border-line max-h-[300px] overflow-auto">
      {map.spots.map((spot) => (
        <button
          className={
            "fish-spot-link [.fishing-workspace_&]:grid [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[12px] [.fishing-workspace_&]:w-full [.fishing-workspace_&]:min-h-[52px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:border-b [.fishing-workspace_&]:border-solid [.fishing-workspace_&]:border-line [.fishing-workspace_&]:rounded-none [.fishing-workspace_&]:text-left [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:text-muted [&_strong]:min-w-0 [&_strong]:font-semibold [&_span]:text-muted [&_span]:text-[13px] [&_span]:whitespace-nowrap [.fishing-workspace_&&&&]:grid-cols-[minmax(0,_1fr)_auto_16px] [.fishing-workspace_&&&&]:p-[10px_4px] [.fishing-workspace_&&&&]:[background:transparent]"
          }
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
