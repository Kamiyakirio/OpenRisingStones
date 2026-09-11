/** Shared XIVAPI item image with a deterministic fallback. */
import { useState } from "react";
import { FishSimple } from "@phosphor-icons/react";
import type { Fish } from "./types";
export function FishIcon({ fish }: { fish: Pick<Fish, "icon"> }) {
  const [failed, setFailed] = useState(false);
  const icon = fish.icon.padStart(6, "0");
  const folder = `${icon.slice(0, 3)}000`;
  return (
    <span className="fish-icon" aria-hidden="true">
      {!failed && fish.icon ? (
        <img
          src={`https://xivapi.com/i/${folder}/${icon}.png`}
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
