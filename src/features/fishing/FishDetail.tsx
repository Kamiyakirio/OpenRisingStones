/** One fish, one preparation path: window, destination, bait, then full conditions. */
import { ArrowLeft, BookmarkSimple, Check } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  isWindowOpen,
  isUnrestricted,
  nextWindows,
  upcomingWindow,
} from "./model";
import {
  durationText,
  kindLabels,
  timeRequirement,
  windowDurationText,
} from "./presentation";
import { WeatherForecast, WeatherSet } from "./Weather";
import { FishBait } from "./FishBait";
import { FishIcon } from "./FishIcon";
import type { Fish, FishCatalog, FishProgress } from "./types";

const localTime = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const methodLabels = { rod: "垂钓", spear: "刺鱼", ocean: "海钓" };

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
  const text =
    fish.method === "ocean"
      ? "随海钓航次判断"
      : open === null
        ? "窗口条件待补充"
        : isUnrestricted(fish, fishEyes)
          ? "全天可钓"
          : open && window
            ? `窗口开放 · 剩余 ${durationText(window.end - now)}`
            : window
              ? `${localTime(window.start)} 开放`
              : "未来一年未找到窗口";
  return (
    <span className={open === true ? "fish-open" : "fish-muted"}>{text}</span>
  );
}

export function FishDetail({
  fish,
  catalog,
  now,
  progress,
  gameManaged,
  gameLogActive,
  gameLogNotice,
  fishEyes: initialFishEyes = false,
  onToggle,
  onBack,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  progress: FishProgress;
  gameManaged: boolean;
  gameLogActive: boolean;
  gameLogNotice?: ReactNode;
  fishEyes?: boolean;
  onToggle: (id: number, key: keyof FishProgress) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [fishEyes, setFishEyes] = useState(initialFishEyes);
  const [windowCount, setWindowCount] = useState(10);
  const [horizonDays, setHorizonDays] = useState(365);
  useEffect(() => heading.current?.focus(), [fish.id]);
  const caught = progress.caught.includes(fish.id);
  const saved = progress.saved.includes(fish.id);
  const condition = fish.conditions;
  const firstSpot = fish.locations[0];
  const firstBait = condition?.bait[0];
  const baitIds =
    firstBait == null ? [] : Array.isArray(firstBait) ? firstBait : [firstBait];
  const baitSummary = baitIds.length
    ? baitIds.map((id) => catalog.items[id] || String(id)).join(" / ")
    : fish.method === "spear"
      ? "查看鱼影大小"
      : "推荐鱼饵待补充";
  const currentWindow = upcomingWindow(fish, catalog, now, fishEyes);
  const open = isWindowOpen(fish, catalog, now, fishEyes);
  const unrestricted = isUnrestricted(fish, fishEyes);
  const windowOrigin =
    currentWindow?.start ?? Math.floor(now / 1400000) * 1400000;
  const windows = nextWindows(
    fish,
    catalog,
    windowOrigin,
    windowCount,
    fishEyes,
    horizonDays,
  );
  const name = (id: number) => catalog.items[id] || String(id);
  const timingHeadline =
    fish.method === "ocean"
      ? "依航次决定"
      : open === null
        ? "窗口待补充"
        : unrestricted
          ? "全天可钓"
          : open
            ? "窗口开放中"
            : currentWindow
              ? localTime(currentWindow.start)
              : "一年内未找到窗口";
  return (
    <div className="fish-detail">
      <button type="button" className="fish-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> 返回钓鱼任务
      </button>
      <header className="fish-detail-heading">
        <FishIcon fish={fish} />
        <div className="fish-detail-title">
          <h1 ref={heading} tabIndex={-1}>
            {fish.name}
          </h1>
          <p>
            {methodLabels[fish.method]} · {fish.zone || "区域未收录"}
            {fish.kind !== "normal" &&
              fish.kind !== "unknown" &&
              ` · ${kindLabels[fish.kind]}`}
          </p>
        </div>
        <div className="fish-detail-actions">
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => onToggle(fish.id, "saved")}
          >
            <BookmarkSimple
              aria-hidden="true"
              weight={saved ? "fill" : "regular"}
            />
            {saved ? "已收藏" : "收藏"}
          </button>
          {gameManaged ? (
            <span className="fish-detail-record" data-caught={caught}>
              {caught && <Check aria-hidden="true" weight="bold" />}
              游戏图鉴：{caught ? "已钓获" : "未钓获"}
            </span>
          ) : (
            <button
              type="button"
              aria-pressed={caught}
              onClick={() => onToggle(fish.id, "caught")}
            >
              <Check aria-hidden="true" />
              {caught ? "已手动记录" : "手动记录钓获"}
            </button>
          )}
        </div>
      </header>
      {gameLogNotice}
      {gameLogActive && !gameManaged && (
        <p className="fish-detail-note">
          这条任务鱼不在游戏钓鱼图鉴中，过去是否钓获无法自动读取。
        </p>
      )}
      <section className="fish-plan" aria-label="本次钓鱼准备">
        <div className="fish-plan-primary">
          <h2>时间窗口</h2>
          <strong>{timingHeadline}</strong>
          <p>
            {fish.method === "ocean"
              ? "当前航次的时段与幻海流需在游戏中确认。"
              : open && currentWindow && !unrestricted
                ? `本机时间 ${localTime(currentWindow.end)} 结束`
                : timeRequirement(fish) === "全天"
                  ? "艾欧泽亚时间不限"
                  : `艾欧泽亚时间 ${timeRequirement(fish)}`}
          </p>
        </div>
        <div>
          <h2>钓点</h2>
          <strong>{firstSpot?.name || "钓点待补充"}</strong>
          <p>
            {firstSpot?.zone || fish.zone || "区域待补充"}
            {firstSpot?.coords &&
              ` · X:${firstSpot.coords[0].toFixed(1)} Y:${firstSpot.coords[1].toFixed(1)}`}
          </p>
        </div>
        <div>
          <h2>{fish.method === "spear" ? "鱼影" : "鱼饵"}</h2>
          <strong>
            {fish.method === "spear"
              ? { Small: "小型鱼影", Normal: "中型鱼影", Large: "大型鱼影" }[
                  condition?.gig || ""
                ] || "鱼影大小待补充"
              : baitSummary}
          </strong>
          {Boolean(condition?.predators.length) && <p>还需先钓前置鱼</p>}
        </div>
      </section>
      {fish.description && (
        <p className="fish-description">
          {fish.description.replace(/<[^>]*>/g, "")}
        </p>
      )}
      <div className="fish-detail-layout">
        <section className="fish-detail-section">
          <header>
            <h2>钓获条件</h2>
          </header>
          {!condition ? (
            <p className="fish-muted">鱼饵与天气条件尚未收录。</p>
          ) : (
            <>
              <dl className="fish-facts">
                <div>
                  <dt>艾欧泽亚时间</dt>
                  <dd>{timeRequirement(fish)}</dd>
                </div>
                <div>
                  <dt>前置天气</dt>
                  <dd>
                    <WeatherSet
                      ids={condition.previousWeather}
                      catalog={catalog}
                      empty="不限"
                    />
                  </dd>
                </div>
                <div>
                  <dt>当前天气</dt>
                  <dd>
                    <WeatherSet ids={condition.weather} catalog={catalog} />
                  </dd>
                </div>
                {condition.tug && (
                  <div>
                    <dt>咬钩</dt>
                    <dd>
                      {{ light: "轻杆", medium: "中杆", heavy: "重杆" }[
                        condition.tug
                      ] || "未收录"}
                    </dd>
                  </div>
                )}
                {condition.hookset && (
                  <div>
                    <dt>提钩</dt>
                    <dd>
                      {{ Precision: "精准提钩", Powerful: "强力提钩" }[
                        condition.hookset
                      ] || "未收录"}
                    </dd>
                  </div>
                )}
                {condition.snagging && (
                  <div>
                    <dt>额外要求</dt>
                    <dd>开启钓组</dd>
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
                <div className="fish-detail-subsection">
                  <h3>鱼饵与以小钓大</h3>
                  {condition.bait.length ? (
                    <FishBait steps={condition.bait} catalog={catalog} />
                  ) : (
                    <p className="fish-muted">推荐鱼饵待补充</p>
                  )}
                </div>
              )}
              {condition.predators.length > 0 && (
                <div className="fish-detail-subsection">
                  <h3>{fish.method === "spear" ? "鱼群前置" : "鱼识前置"}</h3>
                  <ul className="fish-predators">
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
                </div>
              )}
            </>
          )}
          {fish.specialConditions && !condition?.predators.length && (
            <p className="fish-muted">
              游戏图鉴标记了额外条件，具体要求尚未收录。
            </p>
          )}
        </section>
        <section className="fish-detail-section">
          <header>
            <h2>窗口与天气</h2>
            <p>窗口时间按本机时区显示</p>
          </header>
          <WindowStatus
            fish={fish}
            catalog={catalog}
            now={now}
            fishEyes={fishEyes}
          />
          {condition?.fishEyes && fish.method === "rod" && (
            <label className="fish-eyes-toggle">
              <input
                type="checkbox"
                checked={fishEyes}
                onChange={(event) => setFishEyes(event.target.checked)}
              />
              按鱼眼计算时间
            </label>
          )}
          {condition &&
            fish.method !== "ocean" &&
            open !== null &&
            (unrestricted ? (
              <p>全天开放，不受天气限制。</p>
            ) : windows.length ? (
              <>
                <div className="fish-window-head" aria-hidden="true">
                  <span>开始</span>
                  <span>结束</span>
                  <span>时长</span>
                </div>
                <ol className="fish-windows">
                  {windows.map((window) => (
                    <li key={window.start}>
                      <strong>
                        {window.start <= now
                          ? "当前窗口"
                          : localTime(window.start)}
                      </strong>
                      <span>至 {localTime(window.end)}</span>
                      <span className="fish-window-duration">
                        {window.start <= now && "剩余 "}
                        {windowDurationText(
                          window.end - Math.max(window.start, now),
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
                <button
                  className="fish-text-action"
                  onClick={() => {
                    setWindowCount((count) => count + 10);
                    setHorizonDays((days) => days + 365);
                  }}
                >
                  继续计算窗口
                </button>
              </>
            ) : (
              <p className="fish-muted">
                未来 {horizonDays} 天内未找到完整窗口。
              </p>
            ))}
          <p className="fish-window-caveat">
            窗口只按已收录时间与天气计算；鱼识、任务和属性要求需另行确认。
            {fishEyes && "鱼眼计算仅忽略支持该技能的鱼的时间限制。"}
          </p>
          <h3>钓点天气</h3>
          <WeatherForecast fish={fish} catalog={catalog} now={now} />
        </section>
      </div>
      <section className="fish-location-section">
        <header>
          <h2>钓点与图鉴资料</h2>
          {fish.locations.length > 1 && <p>可在多个钓点钓获</p>}
        </header>
        {fish.locations.length ? (
          <ul className="fish-locations">
            {fish.locations.map((spot) => (
              <li key={spot.id}>
                <strong>{spot.name}</strong>
                <span>{spot.zone || fish.zone}</span>
                {spot.coords && (
                  <span>
                    X:{spot.coords[0].toFixed(1)} Y:{spot.coords[1].toFixed(1)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="fish-muted">具体钓点尚未收录。</p>
        )}
        <p className="fish-fine-print">
          {fish.level != null && `Lv. ${fish.level} · `}
          {fish.patch != null && `版本 ${fish.patch} · `}
          物品 ID {fish.id}
          {fish.collectable && " · 可作为收藏品钓获"}
          {fish.aquarium &&
            ` · ${fish.aquarium.water === "Saltwater" ? "海水" : "淡水"}水族箱 ${fish.aquarium.size} 级`}
        </p>
      </section>
    </div>
  );
}
