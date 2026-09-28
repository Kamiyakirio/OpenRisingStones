/** Compact task row: timing and destination lead, rarity remains secondary. */
import { ArrowRight, BookmarkSimple, Check } from "@phosphor-icons/react";
import { FishIcon } from "./FishIcon";
import { isUnrestricted, isWindowOpen, upcomingWindow } from "./model";
import { durationText, kindLabels } from "./presentation";
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
  now,
  fishEyes,
  caught,
  saved,
  gameManaged,
  gameLogActive,
  idPrefix,
  onOpen,
  onToggleSaved,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  fishEyes: boolean;
  caught: boolean;
  saved: boolean;
  gameManaged: boolean;
  gameLogActive: boolean;
  idPrefix: string;
  onOpen: (fish: Fish, triggerId: string) => void;
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
  const record = caught
    ? "已钓获"
    : gameManaged
      ? "未钓获"
      : gameLogActive
        ? "图鉴外 · 未记录"
        : "未标记";
  const triggerId = `${idPrefix}-${fish.id}`;
  return (
    <article className="fish-entry" data-category={category}>
      <button
        id={triggerId}
        type="button"
        className="fish-entry-open"
        onClick={() => onOpen(fish, triggerId)}
      >
        <FishIcon fish={fish} />
        <span className="fish-entry-copy">
          <strong>{fish.name}</strong>
          <span className="fish-entry-meta">
            {fish.zone || "区域未收录"}
            {fish.locations[0]?.name && ` · ${fish.locations[0].name}`}
          </span>
          <span className="fish-entry-type">
            {methodLabels[fish.method]}
            {fish.kind !== "normal" &&
              fish.kind !== "unknown" &&
              ` · ${kindLabels[fish.kind]}`}
          </span>
        </span>
        <span className="fish-entry-timing" data-open={open}>
          {timing}
        </span>
        <ArrowRight className="fish-entry-arrow" aria-hidden="true" />
      </button>
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
