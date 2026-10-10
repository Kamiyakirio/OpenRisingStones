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
        className={
          "fish-ocean-departure-route [.fishing-workspace_&]:grid [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[14px] [.fishing-workspace_&]:min-w-0 [.fishing-workspace_&]:min-h-[82px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:border-t [.fishing-workspace_&]:border-solid [.fishing-workspace_&]:border-line [.fishing-workspace_&]:rounded-none [.fishing-workspace_&]:text-left [.fishing-workspace_&:hover]:bg-hover max-[1150px]:[.fishing-workspace_&:first-child]:border-t max-[1150px]:[.fishing-workspace_&:first-child]:border-solid max-[1150px]:[.fishing-workspace_&:first-child]:border-line max-[620px]:[.fishing-workspace_&]:min-h-[86px] [.fishing-workspace_&&&&]:grid-cols-[190px_180px_minmax(0,_1fr)] [.fishing-workspace_&&&&]:p-[8px_4px] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:first-child]:[border-top:0] [@media(max-width:_620px)]:[.fishing-workspace_&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_620px)]:[.fishing-workspace_&&&&]:gap-[6px_12px]"
        }
        key={route.id}
        onClick={() => onOpen(route, at, triggerId)}
      >
        <span
          className={
            "fish-ocean-departure-targets grid min-w-0 gap-[2px] [&_small]:text-muted [&_small]:text-xs [@media(max-width:_620px)]:[&&&&]:[grid-column:2] [@media(max-width:_620px)]:[&&&&]:[grid-row:1]"
          }
        >
          {targets.length ? (
            targets.map((target) => {
              const label =
                target.type === "blue"
                  ? target.fish.name
                  : `${missionLabels[target.missionType] || "鱼类"}成就`;
              return (
                <span
                  className={
                    "fish-ocean-departure-target flex items-center min-w-0 gap-[5px] text-[13px] [&_>_span:last-child]:overflow-hidden [&_>_span:last-child]:whitespace-nowrap [&&&&_>_span:last-child]:[text-overflow:ellipsis]"
                  }
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
            <span className="fish-ocean-departure-target-empty text-muted text-xs">
              已齐
            </span>
          )}
          <small>查看本航次 {fish.length} 种</small>
        </span>
        <span
          className={
            "fish-ocean-departure-name grid min-w-0 gap-[2px] [&_small]:text-muted [&_small]:text-xs [&_>_span]:text-muted [&_>_span]:text-xs [&_strong]:font-semibold [@media(max-width:_620px)]:[&&&&]:[grid-column:1] [@media(max-width:_620px)]:[&&&&]:[grid-row:1]"
          }
        >
          <small>{route.family === "near" ? "近海" : "远洋"}</small>
          <strong>{route.name}</strong>
          <span>{remaining ? `${remaining} 种未记录` : "已齐"}</span>
        </span>
        <span
          className={
            "fish-ocean-departure-stops flex items-center flex-wrap text-muted text-xs [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[3px] [&_>_span]:whitespace-nowrap [&_svg]:w-[14px] [&_svg]:h-[14px] [&&&&]:gap-[3px_7px] [&&&&]:leading-[1.5] [&&&&_small]:text-[inherit] [@media(max-width:_620px)]:[&&&&]:[grid-column:1_/_-1] [@media(max-width:_620px)]:[&&&&]:[grid-row:2]"
          }
        >
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
    <div className="fish-ocean-schedule max-w-[1240px]">
      <header
        className={
          "fish-ocean-heading flex justify-between flex-wrap mb-[26px] [&_h2]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&_>_span]:text-muted [&_>_span]:text-[13px] [&&&&]:[align-items:end] [&&&&]:gap-[12px_24px] [&&&&_p]:m-[4px_0_0] [&&&&_p]:leading-[1.5] [&&&&_>_span]:m-[4px_0_0] [&&&&_>_span]:leading-[1.5]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold">出海航次</h2>
          <p>登船登记时间按本机时区显示。选一班船，查看三段海域的鱼和钓法。</p>
        </div>
        <span>近海与远洋每两小时各一班</span>
      </header>
      <div
        className={
          "fish-ocean-schedule-columns grid gap-[14px] border-b border-solid border-line text-muted text-[13px] max-[1150px]:hidden [&&&&]:grid-cols-[190px_190px_180px_minmax(0,_1fr)] [&&&&]:p-[9px_0]"
        }
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
              className={
                "fish-ocean-departure grid gap-[14px] border-b border-solid border-line [&_>_header]:grid [&_>_header]:gap-[4px] [&_>_header_>_div]:grid [&_>_header_>_div]:gap-[4px] [&_>_header_span]:text-accent [&_>_header_span]:text-xs [&_>_header_span]:font-semibold [&_time]:text-lg [&_time]:font-semibold [&_time]:tabular-nums [&_>_header_p]:m-0 [&_>_header_p]:text-muted [&_>_header_p]:text-[13px] [&_>_header_p]:tabular-nums max-[1150px]:gap-0 max-[1150px]:[&_>_header]:pb-[6px] [&&&&]:grid-cols-[190px_minmax(0,_1fr)] [&&&&_>_header]:[align-content:start] [&&&&_>_header]:p-[12px_0] [@media(max-width:_1150px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
              }
              key={at}
            >
              <header>
                <div>
                  {index === 0 && (
                    <span>
                      {boarding ? "正在登记" : started ? "已出发" : "下一班"}
                    </span>
                  )}
                  <time dateTime={new Date(at).toISOString()}>
                    {departureText(at)}
                  </time>
                </div>
                <p>
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
              <div
                className={
                  "fish-ocean-departure-options grid [&&&&]:grid-cols-[minmax(0,_1fr)]"
                }
              >
                {routeButton(near, at)}
                {routeButton(far, at)}
              </div>
            </section>
          );
        })}
      </div>
      <button
        className={
          "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
        }
        type="button"
        onClick={onMore}
      >
        再显示 6 班
      </button>
      <p
        className={
          "fish-ocean-note text-muted text-[13px] [&&&&]:m-[12px_0_24px] [&&&&]:leading-[1.5]"
        }
      >
        航次保留至登记开始后 1
        小时。成就目标表示本航次有相关鱼；蓝鱼还需满足幻海流等条件。报名截止时间请以游戏内为准。
      </p>
    </div>
  );
}
