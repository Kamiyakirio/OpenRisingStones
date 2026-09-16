/** Match Asvel's source-first name colors using the existing owned color rules. */
import colors from "../../../../scripts/gearing/config/colors.json";
import type { Bootstrap, Item } from "./types";

export function ItemName({
  item,
  sources,
}: {
  item: Item;
  sources: Bootstrap["sources"];
}) {
  const source =
    sources.find((entry) => entry.id === item.sourceId)?.label ?? "";
  const sourceColors: Record<string, string> = colors.source;
  const rarityColors: Record<string, string> = colors.rarity;
  const color =
    sourceColors[source.slice(0, 2)] ??
    rarityColors[String(item.rarity)] ??
    "white";
  return (
    <span className="gear-item-name" data-color={color}>
      {item.name}
    </span>
  );
}
