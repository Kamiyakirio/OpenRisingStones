/** XIVAPI serves cached game icons; the local fallback keeps offline rows stable. */

import clsx from "clsx";

import { useState } from "react";
import { Cube } from "@phosphor-icons/react";
import type { Item } from "./types";
import {
  assetSourceAvailable,
  itemIconUrl,
  officialAssetUrl,
} from "./xivapiAssets";
export function ItemIcon({ item }: { item: Pick<Item, "iconId" | "name"> }) {
  const source = item.iconId ? itemIconUrl(item.iconId) : null;
  return <GameAssetIcon source={source} />;
}
export function GameAssetIcon({
  source,
  className = "",
  size = "item",
}: {
  source: string | null;
  className?: string;
  size?: "item" | "job";
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [failedFallback, setFailedFallback] = useState<string | null>(null);
  const resolved =
    source && source === failedSource ? officialAssetUrl(source) : source;
  const available = assetSourceAvailable(resolved, failedFallback);
  return (
    <span
      className={clsx(
        "gear-item-icon relative grid shrink-0 place-items-center overflow-hidden rounded-[7px] text-muted",
        size === "job"
          ? "size-6 basis-6 bg-transparent"
          : "size-10 basis-10 bg-hover",
        className,
      )}
      aria-hidden="true"
    >
      {available && (
        <img
          className={clsx(
            "relative z-1 block object-cover",
            size === "job" ? "size-6" : "size-10",
          )}
          src={resolved ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            if (resolved === source) setFailedSource(source);
            else setFailedFallback(resolved);
          }}
        />
      )}
      <Cube className="absolute h-[19px] w-[19px] shrink-0" />
    </span>
  );
}
