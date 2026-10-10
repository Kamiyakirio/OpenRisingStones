/** Shared XIVAPI item image with a deterministic fallback. */
import { useState } from "react";
import { FishSimple } from "@phosphor-icons/react";
import type { Fish } from "../types";
import { xivIconUrl } from "../utils/iconUrl";

export function FishIcon({ fish }: { fish: Pick<Fish, "icon"> }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={
        "fish-icon grid place-items-center w-[44px] h-[44px] [&_img]:w-[40px] [&_img]:h-[40px] [&_img]:object-contain [&_svg]:w-[26px] [&_svg]:h-[26px] [&_svg]:text-muted [.fish-spot-stats-fish_&]:w-[28px] [.fish-spot-stats-fish_&]:h-[28px] [.fish-spot-stats-fish_&_img]:w-[28px] [.fish-spot-stats-fish_&_img]:h-[28px] [.fish-ocean-departure-target_&]:w-[24px] [.fish-ocean-departure-target_&]:h-[24px] [.fish-ocean-departure-target_&_img]:w-[24px] [.fish-ocean-departure-target_&_img]:h-[24px] [.fish-detail-heading_>_&]:w-[56px] [.fish-detail-heading_>_&]:h-[56px] [.fish-detail-heading_>_&_img]:w-[56px] [.fish-detail-heading_>_&_img]:h-[56px] [.timer-catch_&]:w-[36px] [.timer-catch_&]:h-[36px] [.timer-catch_&]:object-contain [.timer-catch_&_img]:w-[36px] [.timer-catch_&_img]:h-[36px] [.timer-catch_&_img]:object-contain [.timer-catch_&_svg]:w-[36px] [.timer-catch_&_svg]:h-[36px] [.timer-catch_&_svg]:object-contain [&&&&]:shrink-[0] [.timer-catch_&&&&]:shrink-[0] [.timer-catch_&&&&_img]:shrink-[0] [.timer-catch_&&&&_svg]:shrink-[0]"
      }
      aria-hidden="true"
    >
      {!failed && fish.icon ? (
        <img
          src={xivIconUrl(fish.icon)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FishSimple />
      )}
    </span>
  );
}
