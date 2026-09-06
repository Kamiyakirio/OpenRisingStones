/** Separate summary actions from compact, consistently ordered metric groups. */
import type { CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import * as G from "../utils/game.ts";
import { useStore } from "./contexts.tsx";
import { Button } from "./Controls.tsx";
import { Icon } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { Dropdown } from "./Dropdown.tsx";
import { ClanPanel } from "./ClanPanel.tsx";
import { SummaryMenu } from "./SummaryMenu.tsx";

export const Summary = observer(() => {
  const store = useStore(),
    effects = store.equippedEffects;
  const supplemental = (stat: G.Stat) => {
    if (!effects) return null;
    if (stat === "SKS" || stat === "SPS") return `${effects.gcd.toFixed(2)}s`;
    if (stat === "VIT") return `${effects.hp} HP`;
    if (stat === "PIE") return `${effects.mp} MP/3s`;
    if (stat === "TEN")
      return `${effects.tenMitigation > 0 ? "−" : ""}${(effects.tenMitigation * 100).toFixed(1)}%`;
    return null;
  };
  return (
    <section className="summary card" aria-label="配装属性汇总">
      <div className="summary_controls">
        <Dropdown
          label={({ ref, toggle }) => (
            <Button ref={ref} className="summary_clan" onClick={toggle}>
              {store.clanText}
            </Button>
          )}
          popper={ClanPanel}
          placement="top-start"
          strategy="fixed"
        />
        <Dropdown
          label={({ ref, toggle }) => (
            <IconButton
              ref={ref}
              className="summary_more"
              icon="more"
              aria-label="更多属性操作"
              onClick={() => {
                store.promotion.off("summaryMenu");
                toggle();
              }}
            />
          )}
          popper={SummaryMenu}
          placement="top-end"
          strategy="fixed"
        />
        {effects && (
          <Button
            className="summary_tiers-toggle"
            onClick={store.toggleTiersShown}
          >
            {store.tiersShown ? "隐藏" : "显示"}阈值差值
          </Button>
        )}
      </div>
      <div
        className={`summary_metrics${effects ? "" : " summary_metrics-production"}`}
        style={
          { "--summary-stat-count": store.schema.stats.length } as CSSProperties
        }
      >
        <div className="summary_metric summary_item-level">
          <span className="summary_label">平均品级</span>
          <span className="summary_value">{store.equippedLevel}</span>
        </div>
        {effects && (
          <div className="summary_metric summary_damage">
            <span className="summary_label">
              每威力伤害期望
              <span
                className="summary_help"
                title={
                  store.job !== "BLU"
                    ? "包括食品和组队加成，不包括手动施放的增益。"
                    : "包括食品、组队加成和以太复制：进攻，不包括其他手动增益。"
                }
              >
                <Icon name="help" />
              </span>
            </span>
            <span className="summary_value">{effects.damage.toFixed(5)}</span>
          </div>
        )}
        {store.schema.stats.map((stat) => {
          const tier =
            effects && store.tiersShown
              ? store.equippedTiers?.[stat]
              : undefined;
          return (
            <div className="summary_metric" key={stat}>
              <span className="summary_label">{G.statNames[stat]}</span>
              <span className="summary_value">{store.equippedStats[stat]}</span>
              {supplemental(stat) && (
                <span
                  className="summary_supplement"
                  title={
                    (stat === "SKS" || stat === "SPS") && store.jobLevel >= 80
                      ? store.schema.statModifiers?.gcdReason
                      : undefined
                  }
                >
                  {supplemental(stat)}
                </span>
              )}
              {tier && (
                <span className="summary_tier">
                  <span>{tier.prev}</span>
                  <span>+{tier.next}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});
