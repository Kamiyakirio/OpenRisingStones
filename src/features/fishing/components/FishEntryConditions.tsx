/** Keep time, weather, and ocean intuition requirements visible in catch lists. */
import { ArrowRight, Clock, Cloud } from "@phosphor-icons/react";
import { timeRequirement } from "../utils/presentation";
import {
  fishingWeatherTypes,
  summarizeWeatherChoices,
} from "../utils/weatherChoices";
import { WeatherIcon } from "./Weather";
import type { Fish, FishCatalog } from "../types";

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
}) {
  // Keep the transition arrow with the first current-weather option on narrow rows.
  const transition = followsPrevious && (
    <ArrowRight
      className={
        "fish-entry-weather-arrow text-muted w-[16px] h-[16px] [&&&&]:flex-[0_0_16px]"
      }
      aria-label="前置天气转为当前天气"
    />
  );
  if (!ids?.length) {
    return (
      <span
        className={
          "fish-entry-weather-option inline-flex items-center flex-wrap gap-[4px] min-w-0 flex-nowrap whitespace-nowrap [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&&&&_>_svg]:flex-[0_0_18px]"
        }
      >
        {transition}
        <Cloud aria-hidden="true" />
        <span>{ids == null ? unknown : "天气不限"}</span>
      </span>
    );
  }
  const summary = summarizeWeatherChoices(ids, possible);
  if (summary.excluded) {
    return (
      <span className="fish-entry-weather-exclusion inline-flex items-center gap-[4px] min-w-0">
        {transition}
        <Cloud
          className="w-[18px] h-[18px] shrink-0 text-muted"
          aria-hidden="true"
        />
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
    <span className="fish-entry-weather-choices inline-flex items-center flex-wrap gap-[4px] min-w-0">
      {summary.ids.map((id, index) => (
        <span
          className={
            "fish-entry-weather-option inline-flex items-center flex-wrap gap-[4px] min-w-0 flex-nowrap whitespace-nowrap [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&&&&_>_svg]:flex-[0_0_18px]"
          }
          key={id}
        >
          {index > 0 && (
            <span className="fish-entry-weather-separator text-muted">/</span>
          )}
          {index === 0 && transition}
          <WeatherIcon id={id} catalog={catalog} />
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
}: {
  fish: Fish;
  catalog: FishCatalog;
  spotId?: number;
  inSpectralCurrent?: boolean;
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
      className={
        "fish-entry-conditions flex items-center flex-wrap min-w-0 text-[13px] [.fish-now-aside_&]:pl-[46px] [&&&&]:[grid-column:1_/_-1] [&&&&]:[grid-row:2] [&&&&]:gap-[4px_18px] [&&&&]:p-[0_8px_3px_56px] [&&&&]:leading-[1.45] [@media(max-width:_620px)]:[&&&&]:[grid-column:1] [@media(max-width:_620px)]:[&&&&]:[grid-row:2] [@media(max-width:_620px)]:[&&&&]:p-[4px_0_2px_48px] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:1_/_-1] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-row:2]"
      }
      aria-label="钓获条件"
    >
      <span
        className={
          "fish-entry-condition inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&&&&_>_svg]:flex-[0_0_18px]"
        }
      >
        <Clock aria-hidden="true" />
        <span>
          {ocean
            ? phases?.length
              ? phases.map((phase) => phaseLabels[phase]).join(" / ")
              : "航次时段不限"
            : `ET ${timeRequirement(fish)}`}
        </span>
      </span>
      {ocean && predators.length > 0 && (
        <span className="fish-entry-intuition inline-flex flex-wrap items-baseline gap-x-[6px] gap-y-[2px] min-w-0">
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
        <span
          className={
            "fish-entry-condition fish-entry-weather inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&&&&_>_svg]:flex-[0_0_18px]"
          }
        >
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
