/** Compact task row: timing and destination lead, rarity remains secondary. */
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

const methodLabels = { rod: "垂钓", spear: "刺鱼", ocean: "海钓" };
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
  return (
    <article
      className={
        "fish-entry grid items-center gap-[0px] border-b border-solid border-line [.fish-now-aside_&]:block max-[620px]:gap-0 [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&]:gap-[6px] [&&&&]:grid-cols-[minmax(0,_1fr)_auto] [@media(max-width:_620px)]:[&&&&]:grid-cols-[minmax(0,_1fr)] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:grid-cols-[minmax(0,_1fr)_auto]"
      }
      data-category={category}
      data-conditions={showConditions}
      data-timing={showTiming}
    >
      <button
        id={triggerId}
        type="button"
        className={
          'fish-entry-open [.fishing-workspace_&]:grid [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[12px] [.fishing-workspace_&]:min-w-0 [.fishing-workspace_&]:w-full [.fishing-workspace_&]:min-h-[80px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:text-left [.fishing-workspace_&:hover]:bg-hover [.fish-now-aside_&]:gap-[6px] max-[620px]:[.fishing-workspace_&]:min-h-[74px] max-[620px]:[.fishing-workspace_&]:gap-[8px] max-[620px]:[.fishing-workspace_&]:pb-0 [@media(min-width:_480px)_and_(max-width:_620px)]:[.fishing-workspace_.fish-spot-page_&]:min-h-[70px] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fishing-workspace_.fish-spot-page_&]:pb-[10px] [.fishing-workspace_&&&&]:[grid-column:1] [.fishing-workspace_&&&&]:[grid-row:1] [.fishing-workspace_&&&&]:grid-cols-[44px_minmax(0,_1fr)_minmax(130px,_auto)_18px] [.fishing-workspace_&&&&]:p-[10px_8px_10px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_.fish-entry[data-timing="false"]_&&&&]:grid-cols-[44px_minmax(0,_1fr)_18px] [.fish-now-aside_&&&&]:grid-cols-[40px_minmax(0,_1fr)_16px] [@media(max-width:_620px)]:[.fishing-workspace_&&&&]:grid-cols-[40px_minmax(0,_1fr)_18px] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fishing-workspace_.fish-spot-page_&&&&]:grid-cols-[40px_minmax(0,_1fr)_minmax(100px,_auto)_18px]'
        }
        onClick={() => onOpen(fish, triggerId, spotId)}
      >
        <FishIcon fish={fish} />
        <span
          className={
            "fish-entry-copy grid min-w-0 gap-[1px] [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_strong]:font-semibold [&&&&_strong]:[text-overflow:ellipsis]"
          }
        >
          <strong>{fish.name}</strong>
          {showLocation && (
            <span
              className={
                "fish-entry-meta overflow-hidden text-muted text-[13px] whitespace-nowrap [&&&&]:[text-overflow:ellipsis]"
              }
            >
              {fish.zone || "区域未收录"}
              {fish.locations[0]?.name && ` · ${fish.locations[0].name}`}
            </span>
          )}
          <span
            className={
              "fish-entry-type flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] text-muted text-[13px]"
            }
          >
            <span>
              {methodLabels[fish.method]}
              {fish.kind !== "normal" &&
                fish.kind !== "unknown" &&
                ` · ${kindLabels[fish.kind]}`}
            </span>
            {fish.method === "ocean" && (
              <span className="fish-entry-points font-semibold text-ink tabular-nums whitespace-nowrap">
                {fish.oceanAveragePoints != null
                  ? `${fish.oceanAveragePoints} 分`
                  : "积分待补充"}
              </span>
            )}
          </span>
        </span>
        {showTiming && (
          <span
            className={
              "fish-entry-timing text-ink text-[13px] tabular-nums whitespace-nowrap [&[data-countdown=true]]:grid [&[data-countdown=true]]:gap-[2px] [&[data-countdown=true]]:text-right [&[data-countdown=true]_strong]:text-accent [&[data-countdown=true]_strong]:font-semibold [&[data-countdown=true]_small]:text-muted [&[data-countdown=true]_small]:text-xs [&[data-open=true]]:text-success [&[data-open=true]]:font-semibold [.fish-now-aside_&]:text-xs max-[620px]:pb-[5px] max-[620px]:[&[data-countdown=true]]:text-left [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&]:pb-0 [.fish-now-aside_&&&&]:[grid-column:2] [.fish-now-aside_&&&&]:[grid-row:2] [@media(max-width:_620px)]:[&&&&]:[grid-column:2] [@media(max-width:_620px)]:[&&&&]:[grid-row:2] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:3] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-row:1]"
            }
            data-open={open}
            data-countdown={Boolean(nextCountdown)}
          >
            {nextCountdown ? (
              <>
                <strong>
                  还有 {windowDurationText(window.start - now)} 可钓
                </strong>
                <small>{localStart(window.start)} 开放</small>
              </>
            ) : (
              timing
            )}
          </span>
        )}
        <ArrowRight
          className={
            'fish-entry-arrow w-[18px] h-[18px] text-muted [.fish-entry[data-timing="false"]_&&&&]:[grid-column:3] [.fish-now-aside_&&&&]:[grid-column:3] [.fish-now-aside_&&&&]:[grid-row:1] [@media(max-width:_620px)]:[&&&&]:[grid-column:3] [@media(max-width:_620px)]:[&&&&]:[grid-row:1] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:4]'
          }
          aria-hidden="true"
        />
      </button>
      {showConditions && (
        <FishEntryConditions
          fish={fish}
          catalog={catalog}
          spotId={spotId}
          inSpectralCurrent={inSpectralCurrent}
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
      />
      <div
        className={
          'fish-entry-side flex items-center gap-[8px] [.fish-now-aside_&]:justify-between max-[620px]:justify-between [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&]:p-0 [&&&&]:[grid-column:2] [&&&&]:[grid-row:1] [.fish-now-aside_&&&&]:p-[0_0_6px_46px] [@media(max-width:_620px)]:[&&&&]:[grid-column:1] [@media(max-width:_620px)]:[&&&&]:[grid-row:4] [@media(max-width:_620px)]:[&&&&]:p-[0_0_5px_48px] [@media(max-width:_620px)]:[.fish-entry[data-conditions="false"]_&&&&]:[grid-row:3] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:2] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-row:1]'
        }
      >
        <span
          className="fish-entry-record inline-flex items-center gap-[3px] min-w-[50px] text-muted text-xs whitespace-nowrap [&[data-caught=true]]:text-success [&_svg]:w-[14px] [&_svg]:h-[14px]"
          data-caught={caught}
        >
          {caught && <Check aria-hidden="true" weight="bold" />}
          {record}
        </span>
        <button
          type="button"
          className={
            "fish-entry-save [.fishing-workspace_&]:grid [.fishing-workspace_&]:place-items-center [.fishing-workspace_&]:w-[40px] [.fishing-workspace_&]:min-w-[40px] [.fishing-workspace_&]:h-[40px] [.fishing-workspace_&]:p-[6px] [&_svg]:w-[19px] [&_svg]:h-[19px] [.fishing-workspace_&&&&]:[border-color:transparent] [.fishing-workspace_&&&&]:[background:transparent]"
          }
          onClick={() => onToggleSaved(fish.id)}
          aria-label={`${saved ? "取消收藏" : "收藏"}${fish.name}`}
          aria-pressed={saved}
          title={saved ? "取消收藏" : "收藏"}
        >
          <BookmarkSimple
            aria-hidden="true"
            weight={saved ? "fill" : "regular"}
          />
        </button>
      </div>
    </article>
  );
}
