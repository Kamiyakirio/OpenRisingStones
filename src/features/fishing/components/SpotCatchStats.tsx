/** Show a dense bait-by-bait catch distribution on a fishing spot page. */

import { fishingEmptyClasses } from "../utilityClasses";
import { FishSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { FishIcon } from "./FishIcon";
import { xivIconUrl } from "../utils/iconUrl";
import { useSpotCatchStats } from "../hooks/useSpotCatchStats";
import type { RowContext } from "./FishingRows";

/** Reused presentation strings stay static and are allocated once for this module. */
const catchColumnHeadingClasses =
  "sticky top-0 bg-canvas text-left text-[13px] font-medium text-muted [&:is(th,_td)]:border-b [&:is(th,_td)]:border-solid [&:is(th,_td)]:border-line [&:is(th,_td)]:px-2 [&:is(th,_td)]:py-[5px] [&:is(th,_td)]:first:pl-0 [&:is(th,_td)]:[&:not(:first-child)]:w-28 [&:is(th,_td)]:[&:not(:first-child)]:text-right [&:is(th,_td)]:[&:not(:first-child)]:whitespace-nowrap";
const catchCellClasses =
  "text-sm [&:is(th,_td)]:border-b [&:is(th,_td)]:border-solid [&:is(th,_td)]:border-line [&:is(th,_td)]:px-2 [&:is(th,_td)]:py-[5px] [&:is(th,_td)]:first:pl-0 [&:is(th,_td)]:[&:not(:first-child)]:w-28 [&:is(th,_td)]:[&:not(:first-child)]:text-right [&:is(th,_td)]:[&:not(:first-child)]:whitespace-nowrap";

const countText = (count: number) => count.toLocaleString("zh-CN");
function percentage(part: number, total: number) {
  if (!total) return "—";
  const value = (part / total) * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value.toLocaleString("zh-CN", {
    maximumFractionDigits: 1,
  })}%`;
}
function BaitIcon({ icon }: { icon?: number }) {
  const [failed, setFailed] = useState(false);
  return icon && !failed ? (
    <img
      className="block size-6"
      src={xivIconUrl(icon)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <FishSimple className="block size-6" aria-hidden="true" />
  );
}
export function SpotCatchStats({
  spotId,
  context,
}: {
  spotId: number;
  context: RowContext;
}) {
  const stats = useSpotCatchStats(spotId);
  const [selectedBaitId, setSelectedBaitId] = useState<number | null>(null);
  const bait =
    stats.data.find((item) => item.baitId === selectedBaitId) ?? stats.data[0];
  return (
    <section
      className="fish-spot-stats mt-6"
      aria-labelledby="fish-spot-stats-title"
    >
      <header className="fish-spot-stats-heading mb-2.5 flex flex-wrap items-end justify-between gap-[10px_24px]">
        <div>
          <h2 className="m-0 text-lg font-semibold" id="fish-spot-stats-title">
            鱼饵与钓获
          </h2>
          <p className="mx-0 mt-[3px] mb-0 text-[13px] text-muted">
            选鱼饵，查看它在这个钓场钓到哪些鱼。
          </p>
        </div>
      </header>
      {stats.status === "ready" && bait && (
        <div
          className="fish-spot-stats-baits mb-2.5 flex flex-wrap gap-1.5"
          role="group"
          aria-label="选择鱼饵"
        >
          {stats.data.map((item) => (
            <button
              key={item.baitId}
              type="button"
              className="fish-spot-stats-bait inline-flex min-h-9.5 items-center gap-[7px] rounded-control border border-solid border-line bg-surface py-1 pr-2 pl-[5px] text-[13px] whitespace-nowrap text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected"
              aria-pressed={bait.baitId === item.baitId}
              onClick={() => setSelectedBaitId(item.baitId)}
            >
              <span
                className="fish-spot-stats-bait-icon block h-6 w-6"
                aria-hidden="true"
              >
                <BaitIcon icon={context.catalog.itemIcons[item.baitId]} />
              </span>
              <span>
                {context.catalog.items[item.baitId] || `物品 ${item.baitId}`}
              </span>
              <small className="text-xs text-muted tabular-nums">
                {countText(item.total)}
              </small>
            </button>
          ))}
        </div>
      )}
      {stats.status === "loading" && (
        <p className={fishingEmptyClasses} role="status">
          正在读取钓获统计…
        </p>
      )}
      {stats.status === "error" && (
        <p className={fishingEmptyClasses} role="status">
          钓获统计暂时无法读取。
          <button
            className="fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
            type="button"
            onClick={stats.retry}
          >
            重试
          </button>
        </p>
      )}
      {stats.status === "ready" && !bait && (
        <p className={fishingEmptyClasses}>这个钓场还没有可用的鱼饵统计。</p>
      )}
      {stats.status === "ready" && bait && (
        <>
          <div
            className="fish-spot-stats-summary flex flex-wrap items-center gap-[4px_16px] px-0 py-2 text-[13px] tabular-nums [border-block:1px_solid_var(--ors-color-line)]"
            aria-label="所选鱼饵的记录"
          >
            <span
              className="fish-spot-stats-bait-icon block h-6 w-6"
              aria-hidden="true"
            >
              <BaitIcon
                key={bait.baitId}
                icon={context.catalog.itemIcons[bait.baitId]}
              />
            </span>
            <strong className="[margin-right:auto] text-[15px]">
              {context.catalog.items[bait.baitId] || `物品 ${bait.baitId}`}
            </strong>
            <span>样本 {countText(bait.total)} 次</span>
            <span>钓获 {countText(bait.caught)} 次</span>
            <span>脱钩等失败 {percentage(bait.missed, bait.total)}</span>
            <span>单独脱钩率 —</span>
          </div>
          <div className="fish-spot-stats-table-wrap max-h-85 [scrollbar-color:var(--ors-color-control-line)_transparent] [scrollbar-gutter:stable] overflow-auto">
            <table className="fish-spot-stats-table w-full min-w-97.5 [border-collapse:collapse] tabular-nums">
              <thead>
                <tr>
                  <th className={catchColumnHeadingClasses} scope="col">
                    鱼
                  </th>
                  <th className={catchColumnHeadingClasses} scope="col">
                    钓获占比
                  </th>
                  <th className={catchColumnHeadingClasses} scope="col">
                    样本
                  </th>
                </tr>
              </thead>
              <tbody>
                {bait.fish.map(({ fishId, reports }) => {
                  const fish = context.fishById.get(fishId);
                  const triggerId = `spot-stats-${spotId}-${fishId}`;
                  return (
                    <tr key={fishId}>
                      <td className={catchCellClasses}>
                        {fish ? (
                          <button
                            id={triggerId}
                            type="button"
                            className="fish-spot-stats-fish inline-flex min-h-8.5 items-center gap-2 rounded-control border-0 border-control bg-transparent p-0 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                            onClick={() =>
                              context.onOpen(fish, triggerId, spotId)
                            }
                          >
                            <FishIcon size="stats" fish={fish} />
                            <span className="last:font-semibold">
                              {fish.name}
                            </span>
                          </button>
                        ) : (
                          <span className="fish-spot-stats-unknown text-muted">
                            物品 {fishId}
                          </span>
                        )}
                      </td>
                      <td className={catchCellClasses}>
                        <strong>{percentage(reports, bait.caught)}</strong>
                      </td>
                      <td className={catchCellClasses}>{countText(reports)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="fish-spot-stats-note mx-0 mt-[3px] mb-0 text-[13px] text-muted">
            Teamcraft
            社区记录。鱼的百分比以成功钓获为分母，并非每次抛竿的咬钩率。
            失败记录合并了脱钩等结果，无法单独算脱钩率；统计也未按时间和天气拆分。
          </p>
        </>
      )}
    </section>
  );
}
