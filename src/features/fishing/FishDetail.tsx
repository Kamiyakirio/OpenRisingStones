/** A focused catch sheet keeps bait chains, weather transitions, and progress together. */
import { ArrowLeft, BookmarkSimple, Check } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  isWindowOpen,
  nextWindows,
  isUnrestricted,
  upcomingWindow,
} from "./model";
import type { Fish, FishCatalog, FishProgress } from "./types";
import { kindLabels, timeRequirement, durationText } from "./presentation";
import { WeatherForecast, WeatherSet } from "./Weather";
import { FishBait } from "./FishBait";
import { FishIcon } from "./FishIcon";
export { FishIcon } from "./FishIcon";
export function WindowStatus({
  fish,
  catalog,
  now,
  fishEyes = false,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  fishEyes?: boolean;
}) {
  const open = isWindowOpen(fish, catalog, now, fishEyes);
  const window = upcomingWindow(fish, catalog, now, fishEyes);
  return (
    <span className={open === true ? "fish-open" : "fish-muted"}>
      {open === null
        ? fish.method === "ocean"
          ? "需结合航次判断"
          : fish.conditions?.startHour == null ||
              fish.conditions?.endHour == null
            ? "缺少具体时段"
            : fish.conditions?.weather == null ||
                fish.conditions?.previousWeather == null
              ? "缺少具体天气条件"
              : "缺少地区天气表"
        : isUnrestricted(fish, fishEyes)
          ? "随时可钓"
          : window
            ? open
              ? `剩余 ${durationText(window.end - now)}`
              : `还有 ${durationText(window.start - now)}开放`
            : "未来一年内未找到窗口"}
    </span>
  );
}
const localTime = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

export function FishDetail({
  fish,
  catalog,
  now,
  progress,
  onToggle,
  onBack,
  fishEyes,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  progress: FishProgress;
  onToggle: (id: number, key: keyof FishProgress) => void;
  onBack: () => void;
  fishEyes: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [fish.id]);
  const condition = fish.conditions;
  const [windowCount, setWindowCount] = useState(10);
  const [horizonDays, setHorizonDays] = useState(365);
  const windowOrigin =
    upcomingWindow(fish, catalog, now, fishEyes)?.start ??
    Math.floor(now / 1400000) * 1400000;
  const windows = useMemo(
    () =>
      nextWindows(
        fish,
        catalog,
        windowOrigin,
        windowCount,
        fishEyes,
        horizonDays,
      ),
    [fish, catalog, windowOrigin, windowCount, fishEyes, horizonDays],
  );
  const name = (id: number) => catalog.items[id] || String(id);
  const unrestricted = isUnrestricted(fish, fishEyes);
  return (
    <>
      <button className="fish-back" onClick={onBack}>
        <ArrowLeft />
        返回鱼类列表
      </button>
      <header className="fish-detail-heading">
        <FishIcon key={fish.id} fish={fish} />
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {fish.name}
          </h1>
          <p className="fish-muted">
            {fish.nameEn} · {kindLabels[fish.kind]} · 物品 ID {fish.id}
          </p>
        </div>
        <div className="fish-actions">
          <button
            aria-pressed={progress.saved.includes(fish.id)}
            onClick={() => onToggle(fish.id, "saved")}
          >
            <BookmarkSimple
              weight={progress.saved.includes(fish.id) ? "fill" : "regular"}
            />
            {progress.saved.includes(fish.id) ? "已收藏" : "收藏"}
          </button>
          <button
            aria-pressed={progress.caught.includes(fish.id)}
            onClick={() => onToggle(fish.id, "caught")}
          >
            <Check />
            {progress.caught.includes(fish.id) ? "已钓获" : "标记已钓获"}
          </button>
        </div>
      </header>
      {fish.description && (
        <p className="fish-description">
          {fish.description.replace(/<[^>]*>/g, "")}
        </p>
      )}
      <div className="fish-detail-layout">
        <section className="fish-section">
          <h2>钓获条件</h2>
          {!condition ? (
            <p className="fish-muted">
              这条鱼暂未收录鱼饵与窗口条件，可先查看钓点或打开参考站点查询。
            </p>
          ) : (
            <>
              <dl className="fish-facts">
                <div>
                  <dt>
                    {fish.method === "ocean" ? "海钓时间" : "艾欧泽亚时间"}
                  </dt>
                  <dd>{timeRequirement(fish)}</dd>
                </div>
                <div>
                  <dt>前置天气</dt>
                  <dd>
                    <WeatherSet
                      ids={condition.previousWeather}
                      catalog={catalog}
                      empty="前置天气不限"
                    />
                  </dd>
                </div>
                <div>
                  <dt>要求天气</dt>
                  <dd>
                    <WeatherSet
                      ids={condition.weather}
                      catalog={catalog}
                      unknown={
                        fish.method === "ocean"
                          ? "航次天气受限，具体天气待补充"
                          : "具体天气待补充"
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>咬钩 / 提钩</dt>
                  <dd>
                    {{ light: "轻杆", medium: "中杆", heavy: "重杆" }[
                      condition.tug || ""
                    ] || "未收录"}{" "}
                    /{" "}
                    {{ Precision: "精准提钩", Powerful: "强力提钩" }[
                      condition.hookset || ""
                    ] || "未收录"}
                  </dd>
                </div>
                {condition.snagging && (
                  <div>
                    <dt>额外要求</dt>
                    <dd>需要开启钓组</dd>
                  </div>
                )}
                {condition.gig && (
                  <div>
                    <dt>捕鱼方式</dt>
                    <dd>
                      刺鱼 ·{" "}
                      {{
                        Small: "小型鱼影",
                        Normal: "中型鱼影",
                        Large: "大型鱼影",
                      }[condition.gig] || "鱼影大小待补充"}
                    </dd>
                  </div>
                )}
                {condition.folklore && (
                  <div>
                    <dt>传承录</dt>
                    <dd>{condition.folklore}</dd>
                  </div>
                )}
              </dl>
              {fish.method !== "spear" && (
                <>
                  <h3>鱼饵与以小钓大</h3>
                  {condition.bait.length ? (
                    <FishBait steps={condition.bait} catalog={catalog} />
                  ) : (
                    <p className="fish-muted">未收录推荐鱼饵</p>
                  )}
                </>
              )}
              {condition.predators.length > 0 && (
                <>
                  <h3>{fish.method === "spear" ? "鱼群前置" : "鱼识前置"}</h3>
                  <ul>
                    {condition.predators.map(([id, count]) => (
                      <li key={id}>
                        {name(id)} × {count}
                      </li>
                    ))}
                  </ul>
                  {condition.intuitionLength && (
                    <p className="fish-muted">
                      鱼识持续 {condition.intuitionLength} 秒
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </section>
        <section className="fish-section">
          <h2>钓点</h2>
          {fish.locations.length ? (
            <ul className="fish-locations">
              {fish.locations.map((spot) => (
                <li key={spot.id}>
                  <strong>{spot.name}</strong>
                  <span>{spot.zone || fish.zone}</span>
                  {spot.coords && (
                    <span className="fish-muted">
                      X: {spot.coords[0].toFixed(1)} Y:{" "}
                      {spot.coords[1].toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="fish-muted">
              {fish.zone || "区域未收录"} · 具体钓点未收录
            </p>
          )}
          <h3>图鉴信息</h3>
          <dl className="fish-facts">
            <div>
              <dt>钓鱼等级</dt>
              <dd>{fish.level ?? "未收录"}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{fish.patch ?? "未收录"}</dd>
            </div>
            {fish.collectable && (
              <div>
                <dt>收藏品</dt>
                <dd>可作为收藏品钓获</dd>
              </div>
            )}
            {fish.aquarium && (
              <div>
                <dt>水族箱</dt>
                <dd>
                  {fish.aquarium.water === "Saltwater" ? "海水" : "淡水"} ·{" "}
                  {fish.aquarium.size} 级
                </dd>
              </div>
            )}
          </dl>
        </section>
        <section className="fish-section fish-window-section">
          <h2>时间与天气窗口</h2>
          <WindowStatus
            fish={fish}
            catalog={catalog}
            now={now}
            fishEyes={fishEyes}
          />
          {condition &&
            fish.method !== "ocean" &&
            isWindowOpen(fish, catalog, now, fishEyes) !== null &&
            (unrestricted ? (
              <p>全天，无天气限制。</p>
            ) : windows.length ? (
              <>
                <ol className="fish-windows">
                  {windows.map((window) => (
                    <li key={window.start}>
                      <strong>
                        {window.start <= now
                          ? "当前窗口"
                          : localTime(window.start)}
                      </strong>
                      <span>至 {localTime(window.end)}</span>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => {
                    setWindowCount((count) => count + 10);
                    setHorizonDays((days) => days + 365);
                  }}
                >
                  继续计算 10 个窗口
                </button>
                {windows.length < windowCount && (
                  <p className="fish-muted">
                    未来 {horizonDays} 天内找到 {windows.length} 个完整窗口。
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="fish-muted">
                  未来 {horizonDays} 天内未找到完整窗口。
                </p>
                <button onClick={() => setHorizonDays((days) => days + 365)}>
                  继续向后查找一年
                </button>
              </>
            ))}
          <p className="fish-muted">
            窗口按本机时间计算，显示本地时间；不包含鱼识、前置任务与属性要求。
            {fishEyes
              ? "已启用鱼眼计算：对支持鱼眼的鱼忽略时间限制，仍需在游戏内使用技能。"
              : "未启用鱼眼计算。"}
          </p>
          {fish.specialConditions && !condition?.predators.length && (
            <p className="fish-muted">
              图鉴标记有额外钓获条件，时间与天气满足不代表已完成该条件。
            </p>
          )}
          <h3>钓点天气预报</h3>
          <WeatherForecast fish={fish} catalog={catalog} now={now} />
        </section>
      </div>
      <p className="fish-muted">
        记录仅保存在本机，可再次点击取消标记。更多资料：
        <a href="https://fish.ffmomola.com/" target="_blank" rel="noreferrer">
          鱼糕
        </a>{" "}
        ·{" "}
        <a href="https://eorzea-weather.com/" target="_blank" rel="noreferrer">
          艾欧泽亚天气
        </a>
      </p>
    </>
  );
}
