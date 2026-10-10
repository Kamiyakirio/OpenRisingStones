/** Game weather icons accompany explicit catch requirements and local forecasts. */
import { Cloud } from "@phosphor-icons/react";
import { useState } from "react";
import { EORZEA_HOUR, weatherAt } from "../utils/model";
import type { Fish, FishCatalog } from "../types";

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
      className={
        "fish-weather-icon [.fish-entry-conditions_&]:w-[18px] [.fish-entry-conditions_&]:h-[18px] [.fish-entry-conditions_&]:text-muted [.fish-entry-conditions_&_img]:w-[18px] [.fish-entry-conditions_&_img]:h-[18px] [.fish-entry-conditions_&_svg]:w-[18px] [.fish-entry-conditions_&_svg]:h-[18px] place-items-center w-[26px] h-[26px] [&_img]:w-[26px] [&_img]:h-[26px] [&_img]:object-contain [&_svg]:w-[20px] [&_svg]:h-[20px] [.fish-entry-conditions_&&&&]:flex-[0_0_18px] [&&&&]:[display:inline-grid]"
      }
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
    <span
      className={
        "fish-weather-set inline-flex items-center flex-wrap [&&&&]:gap-[4px_8px] [&&&&]:[vertical-align:middle]"
      }
    >
      {ids == null ? (
        <span className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
          {unknown}
        </span>
      ) : ids.length === 0 ? (
        <span className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
          {empty}
        </span>
      ) : (
        ids.map((id) => (
          <span
            className={
              "fish-weather-option inline-flex items-center flex-wrap gap-[4px] [&&&&]:gap-[4px_8px] [&&&&]:[vertical-align:middle]"
            }
            key={id}
          >
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
          <span className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
            前置{" "}
          </span>
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
      <p className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
        海钓天气与幻海流由航次决定，本机时间无法预报。
      </p>
    );
  return (
    <>
      {fish.locations.length > 1 && (
        <label
          className={
            "fish-forecast-location flex flex-wrap items-center gap-[8px] [&_select]:min-h-[40px] [&_select]:p-[8px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:bg-surface [&_select]:text-ink [&&&&_select]:max-w-[100%]"
          }
        >
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
        <p className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
          此钓点缺少天气分布数据，无法显示预报。
        </p>
      ) : (
        <div
          className={
            "fish-forecast grid mt-[12px] [&_>_div]:grid [&_>_div]:gap-[5px] [&_>_div]:border-t [&_>_div]:border-solid [&_>_div]:border-line [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&]:gap-[8px_16px] [&&&&_>_div]:[align-content:start] [&&&&_>_div]:p-[10px_0] [@media(max-width:_620px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
          }
        >
          {[-1, 0, 1, 2].map((offset) => {
            const time = start + offset * period;
            const id = weatherAt(catalog, spot.territory, time);
            return (
              <div key={offset}>
                <span className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
                  {offset === -1
                    ? "上一段"
                    : offset === 0
                      ? "当前"
                      : `后 ${offset} 段`}
                </span>
                <WeatherSet ids={id == null ? null : [id]} catalog={catalog} />
                <span className="fish-muted text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums">
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
