/** One fish, one preparation path: window, destination, bait, then full conditions. */
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Check,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isWindowOpen, isUnrestricted, upcomingWindow } from "./model";
import {
  durationText,
  gigLabels,
  hooksetLabels,
  kindLabels,
  timeRequirement,
  tugLabels,
} from "./presentation";
import { WeatherForecast, WeatherSet } from "./Weather";
import { FishIcon } from "./FishIcon";
import { FishBaitSource, FishBaitSourceProvider } from "./FishBaitSource";
import { BaitComparison } from "./BaitComparison";
import { FishingTechnique } from "./FishingTechnique";
import { FishWindowPlanner } from "./FishWindowPlanner";
import { useBiteTimes } from "./useBiteTimes";
import { useSelfMooch } from "./useSelfMooch";
import type { Fish, FishCatalog, FishProgress, FishingLocation } from "./types";

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
  initialSpotId,
  catalog,
  now,
  progress,
  gameManaged,
  gameLogActive,
  gameLogNotice,
  fishEyes: initialFishEyes = false,
  onToggle,
  onOpenSpot,
  onBack,
}: {
  fish: Fish;
  initialSpotId?: number;
  catalog: FishCatalog;
  now: number;
  progress: FishProgress;
  gameManaged: boolean;
  gameLogActive: boolean;
  gameLogNotice?: ReactNode;
  fishEyes?: boolean;
  onToggle: (id: number, key: keyof FishProgress) => void;
  onOpenSpot: (spot: FishingLocation) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [fishEyes, setFishEyes] = useState(initialFishEyes);
  const [spotId, setSpotId] = useState(initialSpotId ?? fish.locations[0]?.id);
  useEffect(() => heading.current?.focus(), [fish.id]);
  const caught = progress.caught.includes(fish.id);
  const saved = progress.saved.includes(fish.id);
  const condition = fish.conditions;
  // Keep the opening row's spot and synchronize every detail view when it changes.
  const activeSpot =
    fish.locations.find((spot) => spot.id === spotId) ?? fish.locations[0];
  const fishById = useMemo(
    () => new Map(catalog.fish.map((item) => [item.id, item])),
    [catalog],
  );
  const biteTimes = useBiteTimes([fish], fishById, activeSpot?.id);
  const selfMooch = useSelfMooch([fish], fishById, activeSpot?.id);
  const firstBait = condition?.bait[0];
  const baitIds =
    firstBait == null ? [] : Array.isArray(firstBait) ? firstBait : [firstBait];
  const currentWindow = upcomingWindow(fish, catalog, now, fishEyes);
  const open = isWindowOpen(fish, catalog, now, fishEyes);
  const unrestricted = isUnrestricted(fish, fishEyes);
  const windowOrigin =
    currentWindow?.start ?? Math.floor(now / 1400000) * 1400000;
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
    <FishBaitSourceProvider catalog={catalog}>
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
            {activeSpot ? (
              <button
                type="button"
                className="fish-plan-spot-link"
                onClick={() => onOpenSpot(activeSpot)}
                aria-label={`查看${activeSpot.name || "此钓场"}的鱼类`}
              >
                <strong>{activeSpot.name || "钓点待补充"}</strong>
                <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <strong>钓点待补充</strong>
            )}
            <p>
              {activeSpot?.zone || fish.zone || "区域待补充"}
              {activeSpot?.coords &&
                ` · X:${activeSpot.coords[0].toFixed(1)} Y:${activeSpot.coords[1].toFixed(1)}`}
            </p>
          </div>
          <div>
            <h2>{fish.method === "spear" ? "鱼影" : "鱼饵"}</h2>
            {fish.method === "spear" ? (
              <strong>
                {gigLabels[condition?.gig || ""] || "鱼影大小待补充"}
              </strong>
            ) : baitIds.length ? (
              <strong className="fish-plan-baits">
                {baitIds.map((id, index) => (
                  <span key={id}>
                    {index > 0 && " / "}
                    <FishBaitSource baitId={id}>
                      {catalog.items[id] || String(id)}
                    </FishBaitSource>
                  </span>
                ))}
              </strong>
            ) : (
              <strong>推荐鱼饵待补充</strong>
            )}
            {Boolean(condition?.predators.length) && <p>还需先钓前置鱼</p>}
            {fish.method !== "spear" && activeSpot && (
              <button
                type="button"
                className="fish-plan-bait-link"
                onClick={() =>
                  document
                    .getElementById("fish-bait-comparison")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                比较不同鱼饵的咬钩时间 <ArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
        {fish.description && (
          <p className="fish-description">
            {fish.description.replace(/<[^>]*>/g, "")}
          </p>
        )}
        {fish.method !== "spear" && (
          <BaitComparison
            fish={fish}
            catalog={catalog}
            spotId={activeSpot?.id}
            onSelectSpot={setSpotId}
          />
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
                      <dd>{tugLabels[condition.tug] || "未收录"}</dd>
                    </div>
                  )}
                  {condition.hookset && (
                    <div>
                      <dt>提钩</dt>
                      <dd>{hooksetLabels[condition.hookset] || "未收录"}</dd>
                    </div>
                  )}
                  {fish.method !== "spear" &&
                    !condition.tug &&
                    !condition.hookset && (
                      <div>
                        <dt>咬钩 / 提钩</dt>
                        <dd>资料待补</dd>
                      </div>
                    )}
                  {condition.snagging && (
                    <div>
                      <dt>额外要求</dt>
                      <dd>开启钓组</dd>
                    </div>
                  )}
                </dl>
                {fish.method !== "spear" && (
                  <div className="fish-detail-subsection">
                    <h3>鱼饵与以小钓大</h3>
                    {condition.bait.length ? (
                      <>
                        <FishingTechnique
                          fish={fish}
                          catalog={catalog}
                          fishById={fishById}
                          biteTimes={biteTimes}
                          selfMooch={selfMooch.confirmed}
                          spotId={activeSpot?.id}
                          showBaitSources
                        />
                        {biteTimes.status === "error" && (
                          <p className="fish-bite-error" role="status">
                            咬钩时间暂时无法读取。
                            <button type="button" onClick={biteTimes.retry}>
                              重试
                            </button>
                          </p>
                        )}
                        {selfMooch.status === "error" && (
                          <p className="fish-bite-error" role="status">
                            回转记录暂时无法读取。
                            <button type="button" onClick={selfMooch.retry}>
                              重试
                            </button>
                          </p>
                        )}
                      </>
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
            {condition && fish.method !== "ocean" && open !== null && (
              <FishWindowPlanner
                fish={fish}
                catalog={catalog}
                now={now}
                fishEyes={fishEyes}
                onFishEyesChange={setFishEyes}
                origin={windowOrigin}
                unrestricted={unrestricted}
              />
            )}
            <p className="fish-window-caveat">
              窗口只按已收录时间与天气计算；鱼识、任务和属性要求需另行确认。
              {fishEyes && "鱼眼计算仅忽略支持该技能的鱼的时间限制。"}
            </p>
            <h3>钓点天气</h3>
            <WeatherForecast
              fish={fish}
              catalog={catalog}
              now={now}
              spotId={activeSpot?.id}
              onSelectSpot={setSpotId}
            />
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
                      X:{spot.coords[0].toFixed(1)} Y:
                      {spot.coords[1].toFixed(1)}
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
    </FishBaitSourceProvider>
  );
}
