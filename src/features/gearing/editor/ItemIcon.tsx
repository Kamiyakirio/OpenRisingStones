/** XIVAPI serves cached game icons; the local fallback keeps offline rows stable. */
import { useState } from "react";
import { Cube } from "@phosphor-icons/react";
import type { Item } from "./types";
import { assetSourceAvailable, itemIconUrl } from "./xivapiAssets";

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
  const available = assetSourceAvailable(source, failedSource);
  return (
    <span className={`gear-item-icon ${className}`} aria-hidden="true">
      {available && (
        <img
          src={source ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(source)}
        />
      )}
      <Cube />
    </span>
  );
}
