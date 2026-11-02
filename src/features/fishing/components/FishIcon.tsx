/** Explicit icon sizes keep shared fish images independent of their surrounding page. */
import clsx from "clsx";
import { useState } from "react";
import { FishSimple } from "@phosphor-icons/react";
import type { Fish } from "../types";
import { xivIconUrl } from "../utils/iconUrl";
const iconSizes = {
  row: {
    frame: "size-11",
    image: "size-10",
    fallback: "size-6.5",
  },
  detail: {
    frame: "size-14",
    image: "size-14",
    fallback: "size-6.5",
  },
  voyage: {
    frame: "size-6",
    image: "size-6",
    fallback: "size-6.5",
  },
  stats: {
    frame: "size-7",
    image: "size-7",
    fallback: "size-6.5",
  },
  catch: {
    frame: "size-9",
    image: "size-9",
    fallback: "size-9",
  },
} as const;
export function FishIcon({
  fish,
  size = "row",
}: {
  fish: Pick<Fish, "icon">;
  size?: keyof typeof iconSizes;
}) {
  const [failed, setFailed] = useState(false);
  const classes = iconSizes[size];
  return (
    <span
      className={clsx(
        "fish-icon grid shrink-0 place-items-center",
        classes.frame,
      )}
      aria-hidden="true"
    >
      {!failed && fish.icon ? (
        <img
          className={clsx("shrink-0 object-contain", classes.image)}
          src={xivIconUrl(fish.icon)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FishSimple className={clsx("shrink-0 text-muted", classes.fallback)} />
      )}
    </span>
  );
}
