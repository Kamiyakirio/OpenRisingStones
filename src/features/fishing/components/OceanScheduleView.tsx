/** Departure times lead into a voyage's three seas and their catch plans. */

import { ArrowRight, Moon, Sun, SunHorizon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { FishIcon } from "./FishIcon";
import { windowDurationText } from "../utils/presentation";
import { oceanRouteFish, oceanRouteTargets } from "../utils/oceanRoutes";
import {
  OCEAN_BOARDING_MS,
  upcomingOceanDepartures,
} from "../utils/oceanSchedule";
import type { RowContext } from "./FishingRows";
import type { OceanRoute } from "../types";

/** Reused presentation strings stay static and are allocated once for this module. */
const scheduleDescriptionClasses =
  "mx-0 mt-1 mb-0 text-[13px] leading-[1.5] text-muted";

const phaseLabels: Record<number, string> = {
  1: "白天",
  2: "黄昏",
  3: "夜晚",
};
const phaseIcons = {
  1: Sun,
  2: SunHorizon,
  3: Moon,
};
const missionLabels: Record<string, string> = {
  Shark: "鲨鱼",
  Jellyfish: "水母",
  Crab: "螃蟹",
  Fugu: "河豚",
  Shellfish: "贝类",
  Squid: "鱿鱼",
  Shrimp: "虾类",
  MantisShrimp: "螳螂虾",
  PrehistoricWavekin: "古代鱼",
  Seadragon: "海马",
  Octopus: "章鱼",
  Manta: "蝠鲼",
};
const departureText = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export function OceanScheduleView({
  context,
  limit,
  onMore,
  onOpen,
}: {
  context: RowContext;
  limit: number;
  onMore: () => void;
  onOpen: (route: OceanRoute, departure: number, triggerId: string) => void;
}) {
  const fishByRoute = useMemo(
    () =>
      new Map(
        context.catalog.oceanRoutes.map((route) => [
          route.id,
          oceanRouteFish(context.catalog, route),
        ]),
      ),
    [context.catalog],
  );
  const caught = new Set(context.progress.caught);
  const departures = upcomingOceanDepartures(
    context.catalog,
    context.now,
    limit,
  );
  const routeButton = (route: OceanRoute, at: number) => {
    const fish = fishByRoute.get(route.id) ?? [];
    const remaining = fish.filter((item) => !caught.has(item.id)).length;
    const targets = oceanRouteTargets(route, fish);
    const triggerId = `fish-voyage-${at}-${route.id}`;
    return (
      <button
        type="button"
        id={triggerId}
        className="fish-ocean-departure-route min-h-10 rounded-control border border-solid border-control bg-surface px-3.5 py-2 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
        key={route.id}
        onClick={() => onOpen(route, at, triggerId)}
      >
        <span className="fish-ocean-departure-targets grid min-w-0 gap-0.5 max-[620px]:col-start-2 max-[620px]:row-start-1">
          {targets.length ? (
            targets.map((target) => {
              const label =
                target.type === "blue"
                  ? target.fish.name
                  : `${missionLabels[target.missionType] || "鱼类"}成就`;
              return (
                <span
                  className="fish-ocean-departure-target flex min-w-0 items-center gap-[5px] text-[13px]"
                  key={
                    target.type === "blue" ? target.fish.id : target.missionType
                  }
                  title={
                    target.type === "blue"
                      ? `蓝鱼：${label}`
                      : `${label} · 图标示例：${target.fish.name}`
                  }
                >
                  <FishIcon size="voyage" fish={target.fish} />
                  <span className="last:overflow-hidden last:text-ellipsis last:whitespace-nowrap">
                    {label}
                  </span>
                </span>
              );
            })
          ) : (
            <span className="fish-ocean-departure-target-empty text-xs text-muted">
              已齐
            </span>
          )}
          <small className="text-xs text-muted">
            查看本航次 {fish.length} 种
          </small>
        </span>
        <span className="fish-ocean-departure-name grid min-w-0 gap-0.5 max-[620px]:col-start-1 max-[620px]:row-start-1">
          <small className="text-xs text-muted">
            {route.family === "near" ? "近海" : "远洋"}
          </small>
          <strong className="font-semibold">{route.name}</strong>
          <span className="text-xs text-muted">
            {remaining ? `${remaining} 种未记录` : "已齐"}
          </span>
        </span>
        <span className="fish-ocean-departure-stops flex flex-wrap items-center gap-[3px_7px] text-xs leading-[1.5] text-muted max-[620px]:col-span-full max-[620px]:row-start-2">
          {route.stops.map((stop, index) => {
            const Icon = phaseIcons[stop.phase as keyof typeof phaseIcons];
            return (
              <span
                className="inline-flex items-center gap-[3px] whitespace-nowrap"
                key={stop.spotId}
              >
                {index > 0 && (
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {Icon && (
                  <Icon aria-hidden="true" className="size-[15px] shrink-0" />
                )}
                {stop.name}
                <small className="text-[inherit]">
                  {phaseLabels[stop.phase] || "时段待补"}
                </small>
              </span>
            );
          })}
        </span>
      </button>
    );
  };
  return (
    <div className="fish-ocean-schedule max-w-310">
      <header className="fish-ocean-heading mb-6.5 flex flex-wrap items-end justify-between gap-[12px_24px]">
        <div>
          <h2 className="m-0 text-lg font-semibold">出海航次</h2>
          <p className={scheduleDescriptionClasses}>
            登船登记时间按本机时区显示。选一班船，查看三段海域的鱼和钓法。
          </p>
        </div>
        <span className={scheduleDescriptionClasses}>
          近海与远洋每两小时各一班
        </span>
      </header>
      <div
        className="fish-ocean-schedule-columns grid grid-cols-[190px_190px_180px_minmax(0,_1fr)] gap-3.5 border-b border-solid border-line px-0 py-[9px] text-[13px] text-muted max-[1150px]:hidden"
        aria-hidden="true"
      >
        <span>登记时间</span>
        <span>目标</span>
        <span>航线</span>
        <span>航线线路</span>
      </div>
      <div className="fish-ocean-departure-list">
        {departures.map(({ at, near, far }, index) => {
          const started = at <= context.now;
          const boarding = started && context.now < at + OCEAN_BOARDING_MS;
          return (
            <section
              className="fish-ocean-departure grid grid-cols-[190px_minmax(0,_1fr)] gap-3.5 border-b border-solid border-line max-[1150px]:grid-cols-1 max-[1150px]:gap-0"
              key={at}
            >
              <header className="grid content-start gap-1 px-0 py-3 max-[1150px]:pb-1.5">
                <div className="grid gap-1">
                  {index === 0 && (
                    <span className="text-xs font-semibold text-accent">
                      {boarding ? "正在登记" : started ? "已出发" : "下一班"}
                    </span>
                  )}
                  <time
                    className="text-lg font-semibold tabular-nums"
                    dateTime={new Date(at).toISOString()}
                  >
                    {departureText(at)}
                  </time>
                </div>
                <p className="m-0 text-[13px] text-muted tabular-nums">
                  {boarding ? "登记中 · 剩余 " : started ? "已出发 " : "还有 "}
                  {windowDurationText(
                    boarding
                      ? at + OCEAN_BOARDING_MS - context.now
                      : started
                        ? context.now - at
                        : at - context.now,
                  )}
                </p>
              </header>
              <div className="fish-ocean-departure-options grid grid-cols-1">
                {routeButton(near, at)}
                {routeButton(far, at)}
              </div>
            </section>
          );
        })}
      </div>
      <button
        className="fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
        type="button"
        onClick={onMore}
      >
        再显示 6 班
      </button>
      <p className="fish-ocean-note mx-0 mt-3 mb-6 text-[13px] leading-[1.5] text-muted">
        航次保留至登记开始后 1
        小时。成就目标表示本航次有相关鱼；蓝鱼还需满足幻海流等条件。报名截止时间请以游戏内为准。
      </p>
    </div>
  );
}
