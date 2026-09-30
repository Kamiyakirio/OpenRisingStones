/** Departure times lead into a voyage's three seas and their catch plans. */
import { ArrowRight, Moon, Sun, SunHorizon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { FishIcon } from "./FishIcon";
import { windowDurationText } from "./presentation";
import { oceanRouteFish, oceanRouteTargets } from "./oceanRoutes";
import { OCEAN_BOARDING_MS, upcomingOceanDepartures } from "./oceanSchedule";
import type { RowContext } from "./FishingRows";
import type { OceanRoute } from "./types";

const phaseLabels: Record<number, string> = {
  1: "白天",
  2: "黄昏",
  3: "夜晚",
};
const phaseIcons = { 1: Sun, 2: SunHorizon, 3: Moon };
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
        className="fish-ocean-departure-route"
        key={route.id}
        onClick={() => onOpen(route, at, triggerId)}
      >
        <span className="fish-ocean-departure-targets">
          {targets.length ? (
            targets.map((target) => {
              const label =
                target.type === "blue"
                  ? target.fish.name
                  : `${missionLabels[target.missionType] || "鱼类"}成就`;
              return (
                <span
                  className="fish-ocean-departure-target"
                  key={
                    target.type === "blue" ? target.fish.id : target.missionType
                  }
                  title={
                    target.type === "blue"
                      ? `蓝鱼：${label}`
                      : `${label} · 图标示例：${target.fish.name}`
                  }
                >
                  <FishIcon fish={target.fish} />
                  <span>{label}</span>
                </span>
              );
            })
          ) : (
            <span className="fish-ocean-departure-target-empty">已齐</span>
          )}
          <small>查看本航次 {fish.length} 种</small>
        </span>
        <span className="fish-ocean-departure-name">
          <small>{route.family === "near" ? "近海" : "远洋"}</small>
          <strong>{route.name}</strong>
          <span>{remaining ? `${remaining} 种未记录` : "已齐"}</span>
        </span>
        <span className="fish-ocean-departure-stops">
          {route.stops.map((stop, index) => {
            const Icon = phaseIcons[stop.phase as keyof typeof phaseIcons];
            return (
              <span key={stop.spotId}>
                {index > 0 && <ArrowRight aria-hidden="true" />}
                {Icon && <Icon aria-hidden="true" />}
                {stop.name}
                <small>{phaseLabels[stop.phase] || "时段待补"}</small>
              </span>
            );
          })}
        </span>
      </button>
    );
  };
  return (
    <div className="fish-ocean-schedule">
      <header className="fish-ocean-heading">
        <div>
          <h2>出海航次</h2>
          <p>登船登记时间按本机时区显示。选一班船，查看三段海域的鱼和钓法。</p>
        </div>
        <span>近海与远洋每两小时各一班</span>
      </header>
      <div className="fish-ocean-schedule-columns" aria-hidden="true">
        <span>登记时间</span>
        <span>目标</span>
        <span>航线</span>
        <span>航线线路</span>
      </div>
      <div className="fish-ocean-departure-list">
        {departures.map(({ at, near, far }, index) => {
          const boarding = at <= context.now;
          return (
            <section className="fish-ocean-departure" key={at}>
              <header>
                <div>
                  {index === 0 && (
                    <span>{boarding ? "正在登记" : "下一班"}</span>
                  )}
                  <time dateTime={new Date(at).toISOString()}>
                    {departureText(at)}
                  </time>
                </div>
                <p>
                  {boarding ? "登记中 · 剩余 " : "还有 "}
                  {windowDurationText(
                    (boarding ? at + OCEAN_BOARDING_MS : at) - context.now,
                  )}
                </p>
              </header>
              <div className="fish-ocean-departure-options">
                {routeButton(near, at)}
                {routeButton(far, at)}
              </div>
            </section>
          );
        })}
      </div>
      <button className="fish-text-action" type="button" onClick={onMore}>
        再显示 6 班
      </button>
      <p className="fish-ocean-note">
        成就目标表示本航次有相关鱼；蓝鱼还需满足幻海流等条件。报名截止时间请以游戏内为准。
      </p>
    </div>
  );
}
