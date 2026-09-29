/** Departure times lead into a voyage's three seas and their catch plans. */
import { ArrowRight, Moon, Sun, SunHorizon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { windowDurationText } from "./presentation";
import { oceanRouteFish } from "./oceanRoutes";
import { OCEAN_BOARDING_MS, upcomingOceanDepartures } from "./oceanSchedule";
import type { RowContext } from "./FishingRows";
import type { OceanRoute } from "./types";

const phaseLabels: Record<number, string> = {
  1: "白天",
  2: "黄昏",
  3: "夜晚",
};
const phaseIcons = { 1: Sun, 2: SunHorizon, 3: Moon };
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
    const remaining =
      fishByRoute.get(route.id)?.filter((fish) => !caught.has(fish.id))
        .length ?? 0;
    const triggerId = `fish-voyage-${at}-${route.id}`;
    return (
      <button
        type="button"
        id={triggerId}
        className="fish-ocean-departure-route"
        key={route.id}
        onClick={() => onOpen(route, at, triggerId)}
      >
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
        航线顺序来自游戏数据；报名截止时间请以游戏内的航行时刻表为准。
      </p>
    </div>
  );
}
