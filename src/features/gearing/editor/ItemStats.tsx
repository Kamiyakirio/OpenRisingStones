/** Effective item stats split capped materia gains from the remaining value. */
import clsx from "clsx";
import type { Bootstrap, Evaluation, Stat } from "./types";
export function ItemStats({
  item,
  data,
  busy,
  label,
  inline = false,
  layout,
}: {
  item: Evaluation["slots"]["mainHand"];
  data: Bootstrap;
  busy: boolean;
  label: string;
  inline?: boolean;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "current-item" | "equipped-select";
}) {
  if (!item?.stats) return null;
  // Equipment buttons only allow phrasing content; detail panels retain a definition list.
  const List = inline ? "span" : "dl";
  const Entry = inline ? "span" : "div";
  const Label = inline ? "span" : "dt";
  const Value = inline ? "span" : "dd";
  // The enclosing equipment row or context strip owns the inset; do not pad twice.
  return (
    <List
      className={clsx(
        "gear-equipped-stats m-0 flex flex-wrap gap-[6px_20px] p-0 text-[13px]",
        layout === "current-item" && "basis-full p-0",
        layout === "equipped-select" && "col-span-full mt-2 p-0 text-left",
      )}
      aria-label={label}
      aria-busy={busy}
    >
      {Object.entries(item.stats)
        .filter(
          ([stat, value]) =>
            value !== 0 && stat !== "main" && stat !== "secondary",
        )
        .map(([stat, value]) => {
          const bonus = item.materiaStats?.[stat as Stat] ?? 0;
          return (
            <Entry
              key={stat}
              className="flex items-baseline gap-1.5 whitespace-nowrap"
            >
              <Label className="gear-stat-label text-muted">
                {data.statNames[stat as Stat] ?? stat}
              </Label>
              <Value className="gear-stat-value m-0 tabular-nums">
                {busy ? (
                  "…"
                ) : (
                  <>
                    {value - bonus}
                    {bonus > 0 && (
                      <span
                        className="gear-materia-bonus font-semibold whitespace-nowrap text-success"
                        title="魔晶石实际加成"
                      >
                        {" "}
                        +{bonus}
                      </span>
                    )}
                  </>
                )}
              </Value>
            </Entry>
          );
        })}
    </List>
  );
}
