/** One selected voyage exposes its three seas and spot-specific catch methods. */
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  oceanRouteFish,
  oceanStopFish,
  type OceanViewState,
} from "./oceanRoutes";
import type { Fish } from "./types";

const phases: Record<number, string> = { 1: "白天", 2: "黄昏", 3: "夜晚" };
const departureText = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export function OceanRouteView({
  context,
  state,
  departure,
  gameLogNotice,
  onChange,
  onBack,
}: {
  context: RowContext;
  state: OceanViewState;
  departure: number;
  gameLogNotice: ReactNode;
  onChange: (next: OceanViewState) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const route = context.catalog.oceanRoutes.find(
    (item) => item.id === state.variantId,
  );
  const stop = route?.stops[state.stopIndex] ?? route?.stops[0];
  const catches = stop
    ? oceanStopFish(context.catalog, stop)
    : { main: [], spectral: [] };
  const caught = new Set(context.progress.caught);
  const saved = new Set(context.progress.saved);
  const show = (fish: Fish[]) =>
    fish.filter((item) =>
      state.scope === "missing"
        ? !caught.has(item.id)
        : state.scope === "saved"
          ? saved.has(item.id)
          : true,
    );
  const main = show(catches.main);
  const spectral = show(catches.spectral);
  const routeFish = route ? oceanRouteFish(context.catalog, route) : [];
  const missing = routeFish.filter((fish) => !caught.has(fish.id)).length;
  useEffect(() => heading.current?.focus({ preventScroll: true }), [route?.id]);

  if (!route || !stop)
    return <p className="fish-inline-empty">这班船的航线资料暂不可用。</p>;

  return (
    <div className="fish-ocean-detail">
      <button className="fish-back" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> 返回出海航次
      </button>
      <header className="fish-ocean-detail-heading">
        <p>
          {departureText(departure)} 开始登记 ·{" "}
          {route.family === "near" ? "近海" : "远洋"}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {route.name}
        </h1>
        <span>
          全程 {routeFish.length} 种鱼 · 未记录 {missing} 种
        </span>
      </header>
      {gameLogNotice}
      <nav className="fish-ocean-stops" aria-label="航线停靠海域">
        {route.stops.map((item, index) => (
          <button
            type="button"
            key={`${route.id}-${item.spotId}`}
            aria-pressed={stop.spotId === item.spotId}
            onClick={() => onChange({ ...state, stopIndex: index })}
          >
            <span>
              第 {index + 1} 站 · {phases[item.phase] || "时段待补"}
            </span>
            <strong>{item.name}</strong>
          </button>
        ))}
      </nav>
      <div className="fish-ocean-stop-heading">
        <div>
          <h2>{stop.name}</h2>
          <p>
            普通海域 {catches.main.length} 种 · 幻海流 {catches.spectral.length}{" "}
            种
          </p>
        </div>
        <div
          className="fish-ocean-scope"
          role="group"
          aria-label="海域鱼类范围"
        >
          {(
            [
              ["all", "全部"],
              ["missing", "未记录"],
              ["saved", "已收藏"],
            ] as const
          ).map(([scope, label]) => (
            <button
              type="button"
              key={scope}
              aria-pressed={state.scope === scope}
              onClick={() => onChange({ ...state, scope })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="fish-ocean-note">
        已按本航次的时段筛选鱼种；天气、鱼识和幻海流是否触发仍需在游戏中确认。
      </p>
      <section className="fish-ocean-fish-section" aria-label="普通海域鱼类">
        <header className="fish-section-heading">
          <div>
            <h3>普通海域</h3>
            <p>
              未记录{" "}
              {catches.main.filter((fish) => !caught.has(fish.id)).length} 种
            </p>
          </div>
          <span className="fish-count">{main.length} 种</span>
        </header>
        {main.length ? (
          <FishingRows
            fish={main}
            idPrefix={`ocean-${route.id}-${stop.spotId}-main`}
            context={context}
            spotId={stop.mainSpotId}
            showLocation={false}
            showConditions={false}
            showTiming={false}
          />
        ) : (
          <p className="fish-inline-empty">这一栏没有符合条件的鱼。</p>
        )}
      </section>
      <section className="fish-ocean-fish-section" aria-label="幻海流鱼类">
        <header className="fish-section-heading">
          <div>
            <h3>幻海流</h3>
            <p>
              未记录{" "}
              {catches.spectral.filter((fish) => !caught.has(fish.id)).length}{" "}
              种
            </p>
          </div>
          <span className="fish-count">{spectral.length} 种</span>
        </header>
        {spectral.length ? (
          <FishingRows
            fish={spectral}
            idPrefix={`ocean-${route.id}-${stop.spotId}-spectral`}
            context={context}
            spotId={stop.spectralSpotId}
            showLocation={false}
            showConditions={false}
            showTiming={false}
          />
        ) : (
          <p className="fish-inline-empty">这一栏没有符合条件的鱼。</p>
        )}
      </section>
    </div>
  );
}
