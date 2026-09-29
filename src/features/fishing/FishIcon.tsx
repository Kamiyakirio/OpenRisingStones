/** Shared XIVAPI item image with a deterministic fallback. */
import { useState } from "react";
import { FishSimple } from "@phosphor-icons/react";
import type { Fish } from "./types";
import { xivIconUrl } from "./iconUrl";

export function FishIcon({ fish }: { fish: Pick<Fish, "icon"> }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="fish-icon" aria-hidden="true">
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
