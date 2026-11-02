/** Compact task row: timing and destination lead, rarity remains secondary. */
import clsx from "clsx";

import { ArrowRight, BookmarkSimple, Check } from "@phosphor-icons/react";
import { FishIcon } from "./FishIcon";
import { FishEntryConditions } from "./FishEntryConditions";
import { FishingTechnique } from "./FishingTechnique";
import type { useBiteTimes } from "../hooks/useBiteTimes";
import { isUnrestricted, isWindowOpen, upcomingWindow } from "../utils/model";
import {
  durationText,
  kindLabels,
  windowDurationText,
} from "../utils/presentation";
import { fishingCategory } from "../utils/workspace";
import type { Fish, FishCatalog } from "../types";
const methodLabels = {
  rod: "垂钓",
  spear: "刺鱼",
  ocean: "海钓",
};
const localStart = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export function FishingRow({
  fish,
  catalog,
  fishById,
  biteTimes,
  selfMooch,
  spotId,
  now,
  fishEyes,
  caught,
  saved,
  gameManaged,
  gameLogActive,
  idPrefix,
  showLocation = true,
  showConditions = true,
  inSpectralCurrent = false,
  showTiming = true,
  showNextCountdown = false,
  onOpen,
  onToggleSaved,
  layout,
}: {
  fish: Fish;
  catalog: FishCatalog;
  fishById: Map<number, Fish>;
  biteTimes: ReturnType<typeof useBiteTimes>;
  selfMooch: ReadonlySet<string>;
  spotId?: number;
  now: number;
  fishEyes: boolean;
  caught: boolean;
  saved: boolean;
  gameManaged: boolean;
  gameLogActive: boolean;
  idPrefix: string;
  showLocation?: boolean;
  showConditions?: boolean;
  inSpectralCurrent?: boolean;
  showTiming?: boolean;
  showNextCountdown?: boolean;
  onOpen: (fish: Fish, triggerId: string, spotId?: number) => void;
  onToggleSaved: (id: number) => void;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "now-aside" | "spot-page" | "fishing-workspace";
}) {
  const category = fishingCategory(fish, catalog, now);
  const fishEyesAllDay = fishEyes && isUnrestricted(fish, true);
  const window =
    category === "timed" && !fishEyesAllDay
      ? upcomingWindow(fish, catalog, now, fishEyes)
      : null;
  const open =
    category === "timed" && isWindowOpen(fish, catalog, now, fishEyes) === true;
  const timing =
    category === "voyage"
      ? "随海钓航次"
      : category === "unknown"
        ? "条件待补充"
        : category === "anytime"
          ? "全天可钓"
          : fishEyesAllDay
            ? "按鱼眼计算：全天"
            : !window
              ? "未来一年未找到窗口"
              : open
                ? `开放中 · 剩余 ${durationText(window.end - now)}`
                : `${localStart(window.start)} 开放`;
  const nextCountdown = showNextCountdown && window && !open;
  const record = caught
    ? "已钓获"
    : gameManaged
      ? "未钓获"
      : gameLogActive
        ? "图鉴外 · 未记录"
        : "未标记";
  const triggerId = `${idPrefix}-${fish.id}`;
  // Sidebar rows stack their actions and timing instead of reserving desktop table columns.
  const compact = layout === "now-aside";
  return (
    <article
      className={clsx(
        "fish-entry group/fish-entry min-w-0 border-b border-solid border-line",
        compact
          ? "block"
          : "grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-0 max-[620px]:grid-cols-1 max-[620px]:gap-0",
        layout === "spot-page" &&
          "[@media(min-width:_480px)_and_(max-width:_620px)]:grid-cols-[minmax(0,_1fr)_auto] [@media(min-width:_480px)_and_(max-width:_620px)]:gap-1.5",
      )}
      data-category={category}
      data-conditions={showConditions}
      data-timing={showTiming}
    >
      <button
        id={triggerId}
        type="button"
        className={
          compact
            ? "fish-entry-open grid w-full min-w-0 grid-cols-[44px_minmax(0,_1fr)_18px] items-center gap-x-2 gap-y-1 rounded-control border-0 bg-transparent px-0 py-2.5 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            : "fish-entry-open col-start-1 row-start-1 grid min-h-20 w-full min-w-0 grid-cols-[44px_minmax(0,_1fr)_minmax(130px,_auto)_18px] items-center gap-3 rounded-control border-0 border-control bg-transparent py-2.5 pr-2 pl-0 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] group-data-[timing=false]/fish-entry:grid-cols-[44px_minmax(0,_1fr)_18px] hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent max-[620px]:min-h-18.5 max-[620px]:grid-cols-[40px_minmax(0,_1fr)_18px] max-[620px]:gap-2 max-[620px]:pb-0 [@media(min-width:_480px)_and_(max-width:_620px)]:min-h-17.5 [@media(min-width:_480px)_and_(max-width:_620px)]:grid-cols-[40px_minmax(0,_1fr)_minmax(100px,_auto)_18px] [@media(min-width:_480px)_and_(max-width:_620px)]:pb-2.5"
        }
        onClick={() => onOpen(fish, triggerId, spotId)}
      >
        <FishIcon fish={fish} />
        <span className="fish-entry-copy grid min-w-0 gap-[1px]">
          <strong className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap">
            {fish.name}
          </strong>
          {showLocation && (
            <span className="fish-entry-meta overflow-hidden text-[13px] text-ellipsis whitespace-nowrap text-muted">
              {fish.zone || "区域未收录"}
              {fish.locations[0]?.name && ` · ${fish.locations[0].name}`}
            </span>
          )}
          <span className="fish-entry-type flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px] text-muted">
            <span>
              {methodLabels[fish.method]}
              {fish.kind !== "normal" &&
                fish.kind !== "unknown" &&
                ` · ${kindLabels[fish.kind]}`}
            </span>
            {fish.method === "ocean" && (
              <span className="fish-entry-points font-semibold whitespace-nowrap text-ink tabular-nums">
                {fish.oceanAveragePoints != null
                  ? `${fish.oceanAveragePoints} 分`
                  : "积分待补充"}
              </span>
            )}
          </span>
        </span>
        {showTiming && (
          <span
            className={clsx(
              "fish-entry-timing group/fish-entry-timing whitespace-nowrap text-ink tabular-nums data-[countdown=true]:grid data-[countdown=true]:gap-0.5 data-[open=true]:font-semibold data-[open=true]:text-success",
              compact
                ? "col-start-2 row-start-2 text-left text-xs"
                : "text-[13px] data-[countdown=true]:text-right max-[620px]:col-start-2 max-[620px]:row-start-2 max-[620px]:pb-[5px] max-[620px]:data-[countdown=true]:text-left",
              layout === "spot-page" &&
                "[@media(min-width:_480px)_and_(max-width:_620px)]:col-start-3 [@media(min-width:_480px)_and_(max-width:_620px)]:row-start-1 [@media(min-width:_480px)_and_(max-width:_620px)]:pb-0",
            )}
            data-open={open}
            data-countdown={Boolean(nextCountdown)}
          >
            {nextCountdown ? (
              <>
                <strong className="group-data-[countdown=true]/fish-entry-timing:font-semibold group-data-[countdown=true]/fish-entry-timing:text-accent">
                  还有 {windowDurationText(window.start - now)} 可钓
                </strong>
                <small className="group-data-[countdown=true]/fish-entry-timing:text-xs group-data-[countdown=true]/fish-entry-timing:text-muted">
                  {localStart(window.start)} 开放
                </small>
              </>
            ) : (
              timing
            )}
          </span>
        )}
        <ArrowRight
          className={clsx(
            "fish-entry-arrow h-4.5 w-4.5 text-muted",
            compact
              ? "col-start-3 row-start-1"
              : "group-data-[timing=false]/fish-entry:col-start-3 max-[620px]:col-start-3 max-[620px]:row-start-1",
            layout === "spot-page" &&
              "[@media(min-width:_480px)_and_(max-width:_620px)]:col-start-4",
          )}
          aria-hidden="true"
        />
      </button>
      {showConditions && (
        <FishEntryConditions
          fish={fish}
          catalog={catalog}
          spotId={spotId}
          inSpectralCurrent={inSpectralCurrent}
          layout={
            layout === "now-aside"
              ? "now-aside"
              : layout === "spot-page"
                ? "spot-page"
                : undefined
          }
        />
      )}
      <FishingTechnique
        fish={fish}
        catalog={catalog}
        fishById={fishById}
        biteTimes={biteTimes}
        selfMooch={selfMooch}
        spotId={spotId}
        showAlternatives={false}
        showBaitSources
        layout={
          layout === "now-aside"
            ? "now-aside"
            : layout === "spot-page"
              ? "spot-page"
              : undefined
        }
      />
      <div
        className={clsx(
          "fish-entry-side flex items-center gap-2",
          compact
            ? "justify-between pt-0 pr-0 pb-1.5 pl-13"
            : "col-start-2 row-start-1 max-[620px]:col-start-1 max-[620px]:row-start-4 max-[620px]:justify-between max-[620px]:pt-0 max-[620px]:pr-0 max-[620px]:pb-[5px] max-[620px]:pl-12 max-[620px]:group-data-[conditions=false]/fish-entry:row-start-3",
          layout === "spot-page" &&
            "[@media(min-width:_480px)_and_(max-width:_620px)]:col-start-2 [@media(min-width:_480px)_and_(max-width:_620px)]:row-start-1 [@media(min-width:_480px)_and_(max-width:_620px)]:p-0",
        )}
      >
        <span
          className="fish-entry-record inline-flex min-w-12.5 items-center gap-[3px] text-xs whitespace-nowrap text-muted data-[caught=true]:text-success"
          data-caught={caught}
        >
          {caught && (
            <Check className="h-3.5 w-3.5" aria-hidden="true" weight="bold" />
          )}
          {record}
        </span>
        <button
          type="button"
          className="fish-entry-save grid h-10 min-h-10 w-10 min-w-10 place-items-center rounded-control border border-solid border-[transparent] bg-transparent p-1.5 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
          onClick={() => onToggleSaved(fish.id)}
          aria-label={`${saved ? "取消收藏" : "收藏"}${fish.name}`}
          aria-pressed={saved}
          title={saved ? "取消收藏" : "收藏"}
        >
          <BookmarkSimple
            className="h-[19px] w-[19px]"
            aria-hidden="true"
            weight={saved ? "fill" : "regular"}
          />
        </button>
      </div>
    </article>
  );
}
