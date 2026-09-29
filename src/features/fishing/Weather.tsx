/** Game weather icons accompany explicit catch requirements and local forecasts. */
import { Cloud } from "@phosphor-icons/react";
import { useState } from "react";
import { EORZEA_HOUR, weatherAt } from "./model";
import type { Fish, FishCatalog } from "./types";

export function WeatherIcon({
  id,
  catalog,
}: {
  id: number;
  catalog: FishCatalog;
}) {
  const [failed, setFailed] = useState(false);
  const icon = catalog.weatherIcons[id];
  const file = String(icon ?? "").padStart(6, "0");
  const name = catalog.weather[id] || `Weather ${id}`;
  return (
    <span
      className="fish-weather-icon"
      title={name}
      role="img"
      aria-label={name}
    >
      {icon && !failed ? (
        <img
          src={`https://xivapi.com/i/${file.slice(0, 3)}000/${file}.png`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Cloud aria-hidden="true" />
      )}
    </span>
  );
}
export function WeatherSet({
  ids,
  catalog,
  empty = "天气不限",
  unknown = "具体天气待补充",
}: {
  ids: number[] | null | undefined;
  catalog: FishCatalog;
  empty?: string;
  unknown?: string;
}) {
  return (
    <span className="fish-weather-set">
      {ids == null ? (
        <span className="fish-muted">{unknown}</span>
      ) : ids.length === 0 ? (
        <span className="fish-muted">{empty}</span>
      ) : (
        ids.map((id) => (
          <span className="fish-weather-option" key={id}>
            <WeatherIcon key={id} id={id} catalog={catalog} />
            <span aria-hidden="true">{catalog.weather[id] || id}</span>
          </span>
        ))
      )}
    </span>
  );
}
export function WeatherRequirements({
  fish,
  catalog,
}: {
  fish: Fish;
  catalog: FishCatalog;
}) {
  const condition = fish.conditions;
  return (
    <div className="fish-weather-requirements">
      {condition?.previousWeather == null ||
      condition.previousWeather.length > 0 ? (
        <span>
          <span className="fish-muted">前置 </span>
          <WeatherSet ids={condition?.previousWeather} catalog={catalog} />
        </span>
      ) : null}
      <WeatherSet
        ids={condition?.weather}
        catalog={catalog}
        unknown={
          fish.method === "ocean"
            ? "航次天气受限，具体天气待补充"
            : "天气条件待补充"
        }
      />
      {fish.method === "ocean" && <small>以航次内天气为准</small>}
    </div>
  );
}
export function WeatherForecast({
  fish,
  catalog,
  now,
  spotId,
  onSelectSpot,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  spotId?: number;
  onSelectSpot: (spotId: number) => void;
}) {
  const spot =
    fish.locations.find((spot) => spot.id === spotId) ?? fish.locations[0];
  const period = 8 * EORZEA_HOUR;
  const start = Math.floor(now / period) * period;
  if (fish.method === "ocean")
    return (
      <p className="fish-muted">
        海钓天气与幻海流由航次决定，本机时间无法预报。
      </p>
    );
  return (
    <>
      {fish.locations.length > 1 && (
        <label className="fish-forecast-location">
          查看钓点天气
          <select
            value={spot?.id}
            onChange={(event) => onSelectSpot(Number(event.target.value))}
          >
            {fish.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.zone} · {location.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!spot || !catalog.weatherRates[spot.territory] ? (
        <p className="fish-muted">此钓点缺少天气分布数据，无法显示预报。</p>
      ) : (
        <div className="fish-forecast">
          {[-1, 0, 1, 2].map((offset) => {
            const time = start + offset * period;
            const id = weatherAt(catalog, spot.territory, time);
            return (
              <div key={offset}>
                <span className="fish-muted">
                  {offset === -1
                    ? "上一段"
                    : offset === 0
                      ? "当前"
                      : `后 ${offset} 段`}
                </span>
                <WeatherSet ids={id == null ? null : [id]} catalog={catalog} />
                <span className="fish-muted">
                  {new Date(time).toLocaleTimeString("zh-CN", {
                    hour12: false,
                  })}
                  –
                  {new Date(time + period).toLocaleTimeString("zh-CN", {
                    hour12: false,
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
