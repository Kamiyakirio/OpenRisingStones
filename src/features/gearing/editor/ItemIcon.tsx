/** XIVAPI serves cached game icons; the local fallback keeps offline rows stable. */
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
}: {
  source: string | null;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [failedFallback, setFailedFallback] = useState<string | null>(null);
  const resolved =
    source && source === failedSource ? officialAssetUrl(source) : source;
  const available = assetSourceAvailable(resolved, failedFallback);
  return (
    <span className={`gear-item-icon ${className}`} aria-hidden="true">
      {available && (
        <img
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
      <Cube />
    </span>
  );
}
