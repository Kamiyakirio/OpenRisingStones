/** Effective item stats split capped materia gains from the remaining value. */
import type { Bootstrap, Evaluation, Stat } from "./types";

export function ItemStats({
  item,
  data,
  busy,
  label,
  inline = false,
}: {
  item: Evaluation["slots"]["mainHand"];
  data: Bootstrap;
  busy: boolean;
  label: string;
  inline?: boolean;
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
      className={
        "gear-equipped-stats flex flex-wrap m-0 text-[13px] [&_>_:is(div,_span)]:flex [&_>_:is(div,_span)]:gap-[6px] [&_>_:is(div,_span)]:items-baseline [&_>_:is(div,_span)]:whitespace-nowrap [.gear-equipped-select_>_&]:p-0 [.gear-equipped-select_>_&]:mt-[8px] [.gear-equipped-select_>_&]:text-left [.gear-current-item_>_&]:p-0 [&&&&]:gap-[6px_20px] [&&&&]:p-0 [.gear-equipped-select_>_&&&&]:[grid-column:1_/_-1] [.gear-current-item_>_&&&&]:[flex-basis:100%]"
      }
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
            <Entry key={stat}>
              <Label className="gear-stat-label [.gear-equipped-stats_&]:text-muted">
                {data.statNames[stat as Stat] ?? stat}
              </Label>
              <Value className="gear-stat-value [.gear-equipped-stats_&]:m-0 [.gear-equipped-stats_&]:tabular-nums">
                {busy ? (
                  "…"
                ) : (
                  <>
                    {value - bonus}
                    {bonus > 0 && (
                      <span
                        className="gear-materia-bonus text-success font-semibold whitespace-nowrap"
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
