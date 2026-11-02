/** Keep time, weather, and ocean intuition requirements visible in catch lists. */

import clsx from "clsx";
import { ArrowRight, Clock, Cloud } from "@phosphor-icons/react";
import { timeRequirement } from "../utils/presentation";
import {
  fishingWeatherTypes,
  summarizeWeatherChoices,
} from "../utils/weatherChoices";
import { WeatherIcon } from "./Weather";
import type { Fish, FishCatalog } from "../types";

/** Reused presentation strings stay static and are allocated once for this module. */
const weatherOptionClasses =
  "fish-entry-weather-option inline-flex min-w-0 flex-nowrap items-center gap-1 whitespace-nowrap";

function WeatherChoices({
  ids,
  catalog,
  unknown,
  possible,
  followsPrevious = false,
}: {
  ids: number[] | null | undefined;
  catalog: FishCatalog;
  unknown: string;
  possible?: number[];
  followsPrevious?: boolean;
  /** Explicit layout variants keep this component independent of ancestor classes. */
}) {
  // Keep the transition arrow with the first current-weather option on narrow rows.
  const transition = followsPrevious && (
    <ArrowRight
      className="fish-entry-weather-arrow size-4 shrink-0 text-muted"
      aria-label="前置天气转为当前天气"
    />
  );
  if (!ids?.length) {
    return (
      <span className={weatherOptionClasses}>
        {transition}
        <Cloud
          className="h-4.5 w-4.5 flex-[0_0_18px] text-muted"
          aria-hidden="true"
        />
        <span>{ids == null ? unknown : "天气不限"}</span>
      </span>
    );
  }
  const summary = summarizeWeatherChoices(ids, possible);
  if (summary.excluded) {
    return (
      <span className="fish-entry-weather-exclusion inline-flex min-w-0 items-center gap-1">
        {transition}
        <Cloud className="h-4.5 w-4.5 shrink-0 text-muted" aria-hidden="true" />
        <span>
          非
          {summary.ids
            .map((id) => catalog.weather[id] || `天气 ${id}`)
            .join("、")}
          天气
        </span>
      </span>
    );
  }
  return (
    <span className="fish-entry-weather-choices inline-flex min-w-0 flex-wrap items-center gap-1">
      {summary.ids.map((id, index) => (
        <span className={weatherOptionClasses} key={id}>
          {index > 0 && (
            <span className="fish-entry-weather-separator text-muted">/</span>
          )}
          {index === 0 && transition}
          <WeatherIcon id={id} catalog={catalog} layout="entry-conditions" />
          <span aria-hidden="true">{catalog.weather[id] || `天气 ${id}`}</span>
        </span>
      ))}
    </span>
  );
}
export function FishEntryConditions({
  fish,
  catalog,
  spotId,
  inSpectralCurrent = false,
  layout,
}: {
  fish: Fish;
  catalog: FishCatalog;
  spotId?: number;
  inSpectralCurrent?: boolean;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "now-aside" | "spot-page";
}) {
  const before = fish.conditions?.previousWeather;
  const current = fish.conditions?.weather;
  const hasBefore = Boolean(before?.length);
  const ocean = fish.method === "ocean";
  // The spectral section already establishes weather 145; retain any extra rules.
  const redundantWeather =
    inSpectralCurrent &&
    ocean &&
    !hasBefore &&
    current?.length === 1 &&
    current[0] === 145;
  const possibleWeather = fishingWeatherTypes(fish, catalog, spotId);
  // Ocean phases belong to the fishing spot, rather than Eorzean clock hours.
  const phases = ocean
    ? catalog.oceanAvailability[`${spotId ?? fish.locations[0]?.id}:${fish.id}`]
    : undefined;
  const phaseLabels: Record<number, string> = {
    1: "白天",
    2: "黄昏",
    3: "夜晚",
  };
  const predators = fish.conditions?.predators ?? [];
  return (
    <div
      className={clsx(
        "fish-entry-conditions col-span-full row-start-2 flex min-w-0 flex-wrap items-center gap-[4px_18px] text-[13px] leading-[1.45]",
        layout === "now-aside"
          ? "pt-0 pr-0 pb-1.5 pl-13"
          : "pt-0 pr-2 pb-[3px] pl-14 max-[620px]:col-start-1 max-[620px]:row-start-2 max-[620px]:pt-1 max-[620px]:pr-0 max-[620px]:pb-0.5 max-[620px]:pl-12",
        layout === "spot-page" &&
          "[@media(min-width:_480px)_and_(max-width:_620px)]:col-span-full [@media(min-width:_480px)_and_(max-width:_620px)]:row-start-2",
      )}
      aria-label="钓获条件"
    >
      <span className="fish-entry-condition inline-flex min-w-0 flex-wrap items-center gap-1">
        <Clock
          className="h-4.5 w-4.5 flex-[0_0_18px] text-muted"
          aria-hidden="true"
        />
        <span>
          {ocean
            ? phases?.length
              ? phases.map((phase) => phaseLabels[phase]).join(" / ")
              : "航次时段不限"
            : `ET ${timeRequirement(fish)}`}
        </span>
      </span>
      {ocean && predators.length > 0 && (
        <span className="fish-entry-intuition inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-muted">鱼识前置</span>
          {predators.map(([id, count], index) => (
            <span key={id}>
              {index > 0 && "、"}
              {catalog.items[id] || String(id)} × {count}
            </span>
          ))}
          {fish.conditions?.intuitionLength != null && (
            <span className="text-muted">
              （鱼识持续 {fish.conditions.intuitionLength} 秒）
            </span>
          )}
        </span>
      )}
      {!redundantWeather && (
        <span className="fish-entry-condition fish-entry-weather inline-flex min-w-0 flex-wrap items-center gap-1">
          <span className="fish-entry-condition-label text-muted">天气</span>
          {hasBefore && (
            <WeatherChoices
              ids={before}
              catalog={catalog}
              unknown="前置天气待补"
              possible={possibleWeather}
            />
          )}
          <WeatherChoices
            ids={current}
            catalog={catalog}
            followsPrevious={hasBefore}
            possible={possibleWeather}
            unknown={
              fish.method === "ocean" ? "航次天气待确认" : "天气条件待补"
            }
          />
        </span>
      )}
    </div>
  );
}
