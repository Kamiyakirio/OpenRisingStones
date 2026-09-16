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
  return (
    <List className="gear-equipped-stats" aria-label={label} aria-busy={busy}>
      {Object.entries(item.stats)
        .filter(
          ([stat, value]) =>
            value !== 0 && stat !== "main" && stat !== "secondary",
        )
        .map(([stat, value]) => {
          const bonus = item.materiaStats?.[stat as Stat] ?? 0;
          return (
            <Entry key={stat}>
              <Label className="gear-stat-label">
                {data.statNames[stat as Stat] ?? stat}
              </Label>
              <Value className="gear-stat-value">
                {busy ? (
                  "…"
                ) : (
                  <>
                    {value - bonus}
                    {bonus > 0 && (
                      <span
                        className="gear-materia-bonus"
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
