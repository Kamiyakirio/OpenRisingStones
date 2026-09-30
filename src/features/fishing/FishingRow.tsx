/** Compact task row: timing and destination lead, rarity remains secondary. */
import { ArrowRight, BookmarkSimple, Check } from "@phosphor-icons/react";
import { FishIcon } from "./FishIcon";
import { FishEntryConditions } from "./FishEntryConditions";
import { FishingTechnique } from "./FishingTechnique";
import type { useBiteTimes } from "./useBiteTimes";
import { isUnrestricted, isWindowOpen, upcomingWindow } from "./model";
import { durationText, kindLabels, windowDurationText } from "./presentation";
import { fishingCategory } from "./workspace";
import type { Fish, FishCatalog } from "./types";

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
      className="fish-entry"
      data-category={category}
      data-conditions={showConditions}
      data-timing={showTiming}
    >
      <button
        id={triggerId}
        type="button"
        className="fish-entry-open"
        onClick={() => onOpen(fish, triggerId, spotId)}
      >
        <FishIcon fish={fish} />
        <span className="fish-entry-copy">
          <strong>{fish.name}</strong>
          {showLocation && (
            <span className="fish-entry-meta">
              {fish.zone || "区域未收录"}
              {fish.locations[0]?.name && ` · ${fish.locations[0].name}`}
            </span>
          )}
          <span className="fish-entry-type">
            {methodLabels[fish.method]}
            {fish.kind !== "normal" &&
              fish.kind !== "unknown" &&
              ` · ${kindLabels[fish.kind]}`}
          </span>
        </span>
        {showTiming && (
          <span
            className="fish-entry-timing"
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
        <ArrowRight className="fish-entry-arrow" aria-hidden="true" />
      </button>
      {showConditions && <FishEntryConditions fish={fish} catalog={catalog} />}
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
      <div className="fish-entry-side">
        <span className="fish-entry-record" data-caught={caught}>
          {caught && <Check aria-hidden="true" weight="bold" />}
          {record}
        </span>
        <button
          type="button"
          className="fish-entry-save"
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
