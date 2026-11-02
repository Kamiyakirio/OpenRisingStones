/** One fish, one preparation path: window, destination, bait, then full conditions. */

import {
  fishingBiteErrorClasses,
  fishingSectionDescriptionClasses,
} from "../utilityClasses";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Check,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isWindowOpen, isUnrestricted, upcomingWindow } from "../utils/model";
import {
  durationText,
  gigLabels,
  hooksetLabels,
  kindLabels,
  timeRequirement,
  tugLabels,
} from "../utils/presentation";
import { WeatherForecast, WeatherSet } from "./Weather";
import { FishIcon } from "./FishIcon";
import { FishBaitSource, FishBaitSourceProvider } from "./FishBaitSource";
import { BaitComparison } from "./BaitComparison";
import { FishingTechnique } from "./FishingTechnique";
import { FishWindowPlanner } from "./FishWindowPlanner";
import { useBiteTimes } from "../hooks/useBiteTimes";
import { useSelfMooch } from "../hooks/useSelfMooch";
import type {
  Fish,
  FishCatalog,
  FishProgress,
  FishingLocation,
} from "../types";

/** Complete utility strings are shared without adding component CSS rules. */
const detailContextButtonClasses =
  "inline-flex min-h-10 items-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-2 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11";
const detailRetryButtonClasses =
  "ml-1.5 min-h-10 rounded-control border border-solid border-control bg-surface px-3.5 py-2 text-accent underline transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11";

/** Reused presentation strings stay static and are allocated once for this module. */
const detailFactHeadingClasses =
  "mx-0 mt-0 mb-2.5 text-lg text-[13px] font-semibold text-muted";
const detailFactHintClasses = "mx-0 mt-[5px] mb-0 text-[13px] text-muted";
const detailFactColumnClasses =
  "min-w-0 border-r border-solid border-line px-4.5 py-5 first:pl-0 last:pr-0 last:[border-right:0] max-[850px]:border-b max-[850px]:border-solid max-[850px]:border-line max-[850px]:px-0 max-[850px]:py-[15px] max-[850px]:[border-right:0] max-[850px]:first:border-b max-[850px]:first:border-solid max-[850px]:first:border-line max-[850px]:first:px-0 max-[850px]:first:py-[15px] max-[850px]:first:[border-right:0] max-[850px]:last:border-b max-[850px]:last:border-solid max-[850px]:last:border-line max-[850px]:last:px-0 max-[850px]:last:py-[15px] max-[850px]:last:[border-bottom:0] max-[850px]:last:[border-right:0]";
const detailFactValueClasses =
  "block text-lg leading-[1.4] [overflow-wrap:anywhere]";
const detailSectionClasses =
  "fish-detail-section min-w-0 border-t border-solid border-line pt-4";
const detailPropertyRowClasses =
  "grid grid-cols-[112px_minmax(0,_1fr)] gap-3 border-b border-solid border-line px-0 py-[9px]";

const localTime = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const methodLabels = {
  rod: "垂钓",
  spear: "刺鱼",
  ocean: "海钓",
};
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
    <span
      className={
        open === true
          ? "fish-open font-semibold text-success"
          : "fish-muted text-muted"
      }
    >
      {text}
    </span>
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
  const windowStatus = (
    <WindowStatus fish={fish} catalog={catalog} now={now} fishEyes={fishEyes} />
  );
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
        <button
          type="button"
          className="fish-back mb-5 inline-flex min-h-10 items-center gap-2 rounded-control border-0 border-control bg-transparent py-2 pr-3.5 pl-0 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" /> 返回钓鱼任务
        </button>
        <header className="fish-detail-heading flex flex-wrap items-center gap-3.5 pb-4">
          <FishIcon size="detail" fish={fish} />
          <div className="fish-detail-title min-w-0 flex-[1_1_230px]">
            <h1
              className="m-0 text-2xl font-bold tracking-tight"
              ref={heading}
              tabIndex={-1}
            >
              {fish.name}
            </h1>
            <p className="mx-0 mt-[3px] mb-0 text-[13px] text-muted">
              {methodLabels[fish.method]} · {fish.zone || "区域未收录"}
              {fish.kind !== "normal" &&
                fish.kind !== "unknown" &&
                ` · ${kindLabels[fish.kind]}`}
            </p>
          </div>
          <div className="fish-detail-actions flex flex-wrap items-center gap-2 max-[620px]:w-full">
            <button
              className={detailContextButtonClasses}
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
              <span
                className="fish-detail-record inline-flex items-center gap-[7px] p-2 text-[13px] text-muted data-[caught=true]:text-success"
                data-caught={caught}
              >
                {caught && <Check aria-hidden="true" weight="bold" />}
                游戏图鉴：{caught ? "已钓获" : "未钓获"}
              </span>
            ) : (
              <button
                className={detailContextButtonClasses}
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
          <p className="fish-detail-note text-[13px] text-muted">
            这条任务鱼不在游戏钓鱼图鉴中，过去是否钓获无法自动读取。
          </p>
        )}
        <section
          className="fish-plan mt-6 grid grid-cols-[1.1fr_1fr_1fr] [border-block:1px_solid_var(--ors-color-line)] max-[850px]:grid-cols-1"
          aria-label="本次钓鱼准备"
        >
          <div className="fish-plan-primary min-w-0 border-r border-solid border-line px-4.5 py-5 first:pl-0 last:pr-0 last:[border-right:0] max-[850px]:border-b max-[850px]:border-solid max-[850px]:border-line max-[850px]:px-0 max-[850px]:py-[15px] max-[850px]:[border-right:0] max-[850px]:first:border-b max-[850px]:first:border-solid max-[850px]:first:border-line max-[850px]:first:px-0 max-[850px]:first:py-[15px] max-[850px]:first:[border-right:0] max-[850px]:last:border-b max-[850px]:last:border-solid max-[850px]:last:border-line max-[850px]:last:px-0 max-[850px]:last:py-[15px] max-[850px]:last:[border-bottom:0] max-[850px]:last:[border-right:0]">
            <h2 className={detailFactHeadingClasses}>时间窗口</h2>
            <strong className="block text-lg leading-[1.4] [overflow-wrap:anywhere] text-accent">
              {timingHeadline}
            </strong>
            <p className={detailFactHintClasses}>
              {fish.method === "ocean"
                ? "当前航次的时段与幻海流需在游戏中确认。"
                : open && currentWindow && !unrestricted
                  ? `本机时间 ${localTime(currentWindow.end)} 结束`
                  : timeRequirement(fish) === "全天"
                    ? "艾欧泽亚时间不限"
                    : `艾欧泽亚时间 ${timeRequirement(fish)}`}
            </p>
          </div>
          <div className={detailFactColumnClasses}>
            <h2 className={detailFactHeadingClasses}>钓点</h2>
            {activeSpot ? (
              <button
                type="button"
                className="fish-plan-spot-link inline-flex min-h-0 items-center gap-2 rounded-control border-0 border-control bg-transparent p-0 text-left text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline hover:[text-underline-offset:3px] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                onClick={() => onOpenSpot(activeSpot)}
                aria-label={`查看${activeSpot.name || "此钓场"}的鱼类`}
              >
                <strong className="block text-lg leading-[1.4] [overflow-wrap:anywhere] text-[inherit]">
                  {activeSpot.name || "钓点待补充"}
                </strong>
                <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <strong className={detailFactValueClasses}>钓点待补充</strong>
            )}
            <p className={detailFactHintClasses}>
              {activeSpot?.zone || fish.zone || "区域待补充"}
              {activeSpot?.coords &&
                ` · X:${activeSpot.coords[0].toFixed(1)} Y:${activeSpot.coords[1].toFixed(1)}`}
            </p>
          </div>
          <div className={detailFactColumnClasses}>
            <h2 className={detailFactHeadingClasses}>
              {fish.method === "spear" ? "鱼影" : "鱼饵"}
            </h2>
            {fish.method === "spear" ? (
              <strong className={detailFactValueClasses}>
                {gigLabels[condition?.gig || ""] || "鱼影大小待补充"}
              </strong>
            ) : baitIds.length ? (
              <strong className="fish-plan-baits block text-lg leading-[1.4] [overflow-wrap:anywhere]">
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
              <strong className={detailFactValueClasses}>推荐鱼饵待补充</strong>
            )}
            {Boolean(condition?.predators.length) && (
              <p className={detailFactHintClasses}>还需先钓前置鱼</p>
            )}
            {fish.method !== "spear" && activeSpot && (
              <button
                type="button"
                className="fish-plan-bait-link mt-2 inline-flex min-h-8 items-center gap-[5px] rounded-control border-0 border-control bg-transparent px-0 py-[3px] text-[13px] text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                onClick={() =>
                  document
                    .getElementById("fish-bait-comparison")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                }
              >
                比较不同鱼饵的咬钩时间 <ArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
        {fish.description && (
          <p className="fish-description mx-0 my-6 max-w-[75ch] leading-[1.7]">
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
        <div className="fish-detail-layout mt-8.5 grid grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)] gap-7.5 max-[850px]:grid-cols-1">
          <section className={detailSectionClasses}>
            <header className="mb-4">
              <h2 className="m-0 text-lg font-semibold">钓获条件</h2>
            </header>
            {!condition ? (
              <p className="fish-muted text-muted">鱼饵与天气条件尚未收录。</p>
            ) : (
              <>
                <dl className="fish-facts m-0">
                  <div className={detailPropertyRowClasses}>
                    <dt className="text-muted">艾欧泽亚时间</dt>
                    <dd className="m-0 [overflow-wrap:anywhere]">
                      {timeRequirement(fish)}
                    </dd>
                  </div>
                  <div className={detailPropertyRowClasses}>
                    <dt className="text-muted">前置天气</dt>
                    <dd className="m-0 [overflow-wrap:anywhere]">
                      <WeatherSet
                        ids={condition.previousWeather}
                        catalog={catalog}
                        empty="不限"
                      />
                    </dd>
                  </div>
                  <div className={detailPropertyRowClasses}>
                    <dt className="text-muted">当前天气</dt>
                    <dd className="m-0 [overflow-wrap:anywhere]">
                      <WeatherSet ids={condition.weather} catalog={catalog} />
                    </dd>
                  </div>
                  {condition.tug && (
                    <div className={detailPropertyRowClasses}>
                      <dt className="text-muted">咬钩</dt>
                      <dd className="m-0 [overflow-wrap:anywhere]">
                        {tugLabels[condition.tug] || "未收录"}
                      </dd>
                    </div>
                  )}
                  {condition.hookset && (
                    <div className={detailPropertyRowClasses}>
                      <dt className="text-muted">提钩</dt>
                      <dd className="m-0 [overflow-wrap:anywhere]">
                        {hooksetLabels[condition.hookset] || "未收录"}
                      </dd>
                    </div>
                  )}
                  {fish.method !== "spear" &&
                    !condition.tug &&
                    !condition.hookset && (
                      <div className={detailPropertyRowClasses}>
                        <dt className="text-muted">咬钩 / 提钩</dt>
                        <dd className="m-0 [overflow-wrap:anywhere]">
                          资料待补
                        </dd>
                      </div>
                    )}
                  {condition.snagging && (
                    <div className={detailPropertyRowClasses}>
                      <dt className="text-muted">额外要求</dt>
                      <dd className="m-0 [overflow-wrap:anywhere]">开启钓组</dd>
                    </div>
                  )}
                </dl>
                {fish.method !== "spear" && (
                  <div className="fish-detail-subsection mt-5.5">
                    <h3 className="mx-0 mt-6 mb-3 text-base font-semibold">
                      鱼饵与以小钓大
                    </h3>
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
                          layout="detail-subsection"
                        />
                        {biteTimes.status === "error" && (
                          <p className={fishingBiteErrorClasses} role="status">
                            咬钩时间暂时无法读取。
                            <button
                              className={detailRetryButtonClasses}
                              type="button"
                              onClick={biteTimes.retry}
                            >
                              重试
                            </button>
                          </p>
                        )}
                        {selfMooch.status === "error" && (
                          <p className={fishingBiteErrorClasses} role="status">
                            回转记录暂时无法读取。
                            <button
                              className={detailRetryButtonClasses}
                              type="button"
                              onClick={selfMooch.retry}
                            >
                              重试
                            </button>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="fish-muted text-muted">推荐鱼饵待补充</p>
                    )}
                  </div>
                )}
                {condition.predators.length > 0 && (
                  <div className="fish-detail-subsection mt-5.5">
                    <h3 className="mx-0 mt-6 mb-3 text-base font-semibold">
                      {fish.method === "spear" ? "鱼群前置" : "鱼识前置"}
                    </h3>
                    <ul className="fish-predators m-0 pl-5">
                      {condition.predators.map(([id, count]) => (
                        <li className="px-0 py-[3px]" key={id}>
                          {name(id)} × {count}
                        </li>
                      ))}
                    </ul>
                    {condition.intuitionLength && (
                      <p className="fish-muted text-muted">
                        鱼识持续 {condition.intuitionLength} 秒
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {fish.specialConditions && !condition?.predators.length && (
              <p className="fish-muted text-muted">
                游戏图鉴标记了额外条件，具体要求尚未收录。
              </p>
            )}
          </section>
          <section className={detailSectionClasses}>
            <header className="mb-4">
              <h2 className="m-0 text-lg font-semibold">窗口与天气</h2>
              <p className={fishingSectionDescriptionClasses}>
                窗口时间按本机时区显示
              </p>
            </header>
            {condition && fish.method !== "ocean" && open !== null ? (
              <FishWindowPlanner
                fish={fish}
                catalog={catalog}
                now={now}
                fishEyes={fishEyes}
                onFishEyesChange={setFishEyes}
                origin={windowOrigin}
                unrestricted={unrestricted}
                status={windowStatus}
              />
            ) : (
              windowStatus
            )}
            <p className="fish-window-caveat text-[13px] leading-[1.6] text-muted">
              窗口只按已收录时间与天气计算；鱼识、任务和属性要求需另行确认。
              {fishEyes && "鱼眼计算仅忽略支持该技能的鱼的时间限制。"}
            </p>
            <h3 className="mx-0 mt-6 mb-3 text-base font-semibold">钓点天气</h3>
            <WeatherForecast
              fish={fish}
              catalog={catalog}
              now={now}
              spotId={activeSpot?.id}
              onSelectSpot={setSpotId}
            />
          </section>
        </div>
        <section className="fish-location-section mt-8.5 min-w-0 border-t border-solid border-line pt-4">
          <header className="mb-4">
            <h2 className="m-0 text-lg font-semibold">钓点与图鉴资料</h2>
            {fish.locations.length > 1 && (
              <p className={fishingSectionDescriptionClasses}>
                可在多个钓点钓获
              </p>
            )}
          </header>
          {fish.locations.length ? (
            <ul className="fish-locations m-0 grid list-none grid-cols-2 gap-[0_20px] p-0 max-[620px]:grid-cols-1">
              {fish.locations.map((spot) => (
                <li
                  className="flex flex-wrap gap-[4px_12px] border-b border-solid border-line px-0 py-3"
                  key={spot.id}
                >
                  <strong className="w-full">{spot.name}</strong>
                  <span className="text-[13px] text-muted">
                    {spot.zone || fish.zone}
                  </span>
                  {spot.coords && (
                    <span className="text-[13px] text-muted">
                      X:{spot.coords[0].toFixed(1)} Y:
                      {spot.coords[1].toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="fish-muted text-muted">具体钓点尚未收录。</p>
          )}
          <p className="fish-fine-print mt-5.5 text-[13px] leading-[1.6] text-muted">
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
