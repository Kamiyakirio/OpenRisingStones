/** One selected voyage exposes its three seas and spot-specific catch methods. */

import {
  fishingEmptyClasses,
  fishingSectionHeadingClasses,
  fishingSectionDescriptionClasses,
} from "../utilityClasses";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  oceanRouteFish,
  oceanStopFish,
  type OceanViewState,
} from "../utils/oceanRoutes";
import type { Fish } from "../types";

/** Reused presentation strings stay static and are allocated once for this module. */
const routeCountClasses = "fish-count text-[13px] text-muted tabular-nums";

const phases: Record<number, string> = {
  1: "白天",
  2: "黄昏",
  3: "夜晚",
};
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
    : {
        main: [],
        spectral: [],
      };
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
  useEffect(
    () =>
      heading.current?.focus({
        preventScroll: true,
      }),
    [route?.id],
  );
  if (!route || !stop)
    return <p className={fishingEmptyClasses}>这班船的航线资料暂不可用。</p>;
  return (
    <div className="fish-ocean-detail max-w-280">
      <button
        className="fish-back mb-5 inline-flex min-h-10 items-center gap-2 rounded-control border-0 border-control bg-transparent py-2 pr-3.5 pl-0 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="h-[19px] w-[19px]" aria-hidden="true" />{" "}
        返回出海航次
      </button>
      <header className="fish-ocean-detail-heading mx-0 mt-3.5 mb-6">
        <p className="m-0 text-[13px] text-muted">
          {departureText(departure)} 开始登记 ·{" "}
          {route.family === "near" ? "近海" : "远洋"}
        </p>
        <h1
          className="mx-0 my-1 text-2xl font-bold tracking-tight"
          ref={heading}
          tabIndex={-1}
        >
          {route.name}
        </h1>
        <span className="m-0 text-[13px] text-muted">
          全程 {routeFish.length} 种鱼 · 未记录 {missing} 种
        </span>
      </header>
      {gameLogNotice}
      <nav
        className="fish-ocean-stops mx-0 my-6 grid grid-cols-3 gap-[5px] border-b border-solid border-line max-[620px]:grid-cols-1 max-[620px]:gap-0"
        aria-label="航线停靠海域"
      >
        {route.stops.map((item, index) => (
          <button
            className="grid min-h-17 min-w-0 content-center gap-1 rounded-none border-0 bg-transparent px-2.5 py-2 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] [border-bottom:2px_solid_transparent] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:[border-bottom-color:var(--ors-color-accent)] aria-pressed:bg-selected aria-pressed:text-accent max-[620px]:flex max-[620px]:min-h-12.5 max-[620px]:items-baseline max-[620px]:justify-between max-[620px]:border-b max-[620px]:border-solid max-[620px]:border-line"
            type="button"
            key={`${route.id}-${item.spotId}`}
            aria-pressed={stop.spotId === item.spotId}
            onClick={() =>
              onChange({
                ...state,
                stopIndex: index,
              })
            }
          >
            <span className="text-xs text-muted">
              第 {index + 1} 站 · {phases[item.phase] || "时段待补"}
            </span>
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap max-[620px]:text-right">
              {item.name}
            </strong>
          </button>
        ))}
      </nav>
      <div className="fish-ocean-stop-heading flex flex-wrap items-end justify-between gap-[12px_24px]">
        <div>
          <h2 className="m-0 text-lg text-[1.2rem] font-semibold">
            {stop.name}
          </h2>
          <p className="mx-0 mt-1 mb-0 text-[13px] leading-[1.5] text-muted">
            普通海域 {catches.main.length} 种 · 幻海流 {catches.spectral.length}{" "}
            种
          </p>
        </div>
        <div
          className="fish-ocean-scope inline-flex flex-wrap gap-[5px]"
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
              className="min-h-9 rounded-control border border-solid border-control bg-surface px-[9px] py-[5px] text-[13px] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected"
              type="button"
              key={scope}
              aria-pressed={state.scope === scope}
              onClick={() =>
                onChange({
                  ...state,
                  scope,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="fish-ocean-note mx-0 mt-3 mb-6 text-[13px] leading-[1.5] text-muted">
        已按本航次的时段筛选鱼种；天气、鱼识和幻海流是否触发仍需在游戏中确认。积分为单条鱼的参考分值，不含航次结算加成。
      </p>
      <section className="fish-ocean-fish-section" aria-label="普通海域鱼类">
        <header className={fishingSectionHeadingClasses}>
          <div>
            <h3 className="m-0 text-lg font-semibold">普通海域</h3>
            <p className={fishingSectionDescriptionClasses}>
              未记录{" "}
              {catches.main.filter((fish) => !caught.has(fish.id)).length} 种
            </p>
          </div>
          <span className={routeCountClasses}>{main.length} 种</span>
        </header>
        {main.length ? (
          <FishingRows
            fish={main}
            idPrefix={`ocean-${route.id}-${stop.spotId}-main`}
            context={context}
            spotId={stop.mainSpotId}
            showLocation={false}
            showTiming={false}
          />
        ) : (
          <p className={fishingEmptyClasses}>这一栏没有符合条件的鱼。</p>
        )}
      </section>
      <section className="fish-ocean-fish-section mt-8" aria-label="幻海流鱼类">
        <header className={fishingSectionHeadingClasses}>
          <div>
            <h3 className="m-0 text-lg font-semibold">幻海流</h3>
            <p className={fishingSectionDescriptionClasses}>
              未记录{" "}
              {catches.spectral.filter((fish) => !caught.has(fish.id)).length}{" "}
              种
            </p>
          </div>
          <span className={routeCountClasses}>{spectral.length} 种</span>
        </header>
        {spectral.length ? (
          <FishingRows
            fish={spectral}
            idPrefix={`ocean-${route.id}-${stop.spotId}-spectral`}
            context={context}
            spotId={stop.spectralSpotId}
            inSpectralCurrent
            showLocation={false}
            showTiming={false}
          />
        ) : (
          <p className={fishingEmptyClasses}>这一栏没有符合条件的鱼。</p>
        )}
      </section>
    </div>
  );
}
