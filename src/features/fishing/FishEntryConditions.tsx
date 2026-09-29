/** Show the ET and weather requirements beside a fish's quick catch instructions. */
import { ArrowRight, Clock, Cloud } from "@phosphor-icons/react";
import { timeRequirement } from "./presentation";
import { WeatherIcon } from "./Weather";
import type { Fish, FishCatalog } from "./types";

function WeatherChoices({
  ids,
  catalog,
  unknown,
  followsPrevious = false,
}: {
  ids: number[] | null | undefined;
  catalog: FishCatalog;
  unknown: string;
  followsPrevious?: boolean;
}) {
  // Keep the transition arrow with the first current-weather option on narrow rows.
  const transition = followsPrevious && (
    <ArrowRight
      className="fish-entry-weather-arrow"
      aria-label="前置天气转为当前天气"
    />
  );
  if (!ids?.length) {
    return (
      <span className="fish-entry-weather-option">
        {transition}
        <Cloud aria-hidden="true" />
        <span>{ids == null ? unknown : "天气不限"}</span>
      </span>
    );
  }
  return (
    <span className="fish-entry-weather-choices">
      {ids.map((id, index) => (
        <span className="fish-entry-weather-option" key={id}>
          {index > 0 && <span className="fish-entry-weather-separator">/</span>}
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
}: {
  fish: Fish;
  catalog: FishCatalog;
}) {
  const before = fish.conditions?.previousWeather;
  const current = fish.conditions?.weather;
  const hasBefore = Boolean(before?.length);
  return (
    <div className="fish-entry-conditions" aria-label="钓获时间与天气条件">
      <span className="fish-entry-condition">
        <Clock aria-hidden="true" />
        <span>
          {fish.method === "ocean" ? "" : "ET "}
          {timeRequirement(fish)}
        </span>
      </span>
      <span className="fish-entry-condition fish-entry-weather">
        <span className="fish-entry-condition-label">天气</span>
        {hasBefore && (
          <WeatherChoices
            ids={before}
            catalog={catalog}
            unknown="前置天气待补"
          />
        )}
        <WeatherChoices
          ids={current}
          catalog={catalog}
          followsPrevious={hasBefore}
          unknown={fish.method === "ocean" ? "航次天气待确认" : "天气条件待补"}
        />
      </span>
    </div>
  );
}
