/** Show a dense bait-by-bait catch distribution on a fishing spot page. */
import { FishSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { FishIcon } from "./FishIcon";
import { xivIconUrl } from "../utils/iconUrl";
import { useSpotCatchStats } from "../hooks/useSpotCatchStats";
import type { RowContext } from "./FishingRows";

const countText = (count: number) => count.toLocaleString("zh-CN");

function percentage(part: number, total: number) {
  if (!total) return "—";
  const value = (part / total) * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}%`;
}

function BaitIcon({ icon }: { icon?: number }) {
  const [failed, setFailed] = useState(false);
  return icon && !failed ? (
    <img
      src={xivIconUrl(icon)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <FishSimple aria-hidden="true" />
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
      className="fish-spot-stats mt-[24px]"
      aria-labelledby="fish-spot-stats-title"
    >
      <header
        className={
          "fish-spot-stats-heading flex justify-between flex-wrap mb-[10px] [&_h2]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&&&&]:[align-items:end] [&&&&]:gap-[10px_24px] [&&&&_p]:m-[3px_0_0]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold" id="fish-spot-stats-title">
            鱼饵与钓获
          </h2>
          <p>选鱼饵，查看它在这个钓场钓到哪些鱼。</p>
        </div>
      </header>
      {stats.status === "ready" && bait && (
        <div
          className="fish-spot-stats-baits flex flex-wrap gap-[6px] mb-[10px]"
          role="group"
          aria-label="选择鱼饵"
        >
          {stats.data.map((item) => (
            <button
              key={item.baitId}
              type="button"
              className={
                "fish-spot-stats-bait [.fishing-workspace_&]:inline-flex [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[7px] [.fishing-workspace_&]:min-h-[38px] [.fishing-workspace_&]:border-line [.fishing-workspace_&]:text-[13px] [.fishing-workspace_&]:whitespace-nowrap [&_small]:text-muted [&_small]:text-xs [&_small]:tabular-nums [.fishing-workspace_&&&&]:p-[4px_8px_4px_5px]"
              }
              aria-pressed={bait.baitId === item.baitId}
              onClick={() => setSelectedBaitId(item.baitId)}
            >
              <span
                className="fish-spot-stats-bait-icon block w-[24px] h-[24px] [&_:is(img,_svg)]:block [&_:is(img,_svg)]:w-[24px] [&_:is(img,_svg)]:h-[24px]"
                aria-hidden="true"
              >
                <BaitIcon icon={context.catalog.itemIcons[item.baitId]} />
              </span>
              <span>
                {context.catalog.items[item.baitId] || `物品 ${item.baitId}`}
              </span>
              <small>{countText(item.total)}</small>
            </button>
          ))}
        </div>
      )}
      {stats.status === "loading" && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
          role="status"
        >
          正在读取钓获统计…
        </p>
      )}
      {stats.status === "error" && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
          role="status"
        >
          钓获统计暂时无法读取。
          <button
            className={
              "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
            }
            type="button"
            onClick={stats.retry}
          >
            重试
          </button>
        </p>
      )}
      {stats.status === "ready" && !bait && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
        >
          这个钓场还没有可用的鱼饵统计。
        </p>
      )}
      {stats.status === "ready" && bait && (
        <>
          <div
            className={
              "fish-spot-stats-summary flex items-center flex-wrap text-[13px] tabular-nums [&_>_strong]:text-[15px] [&&&&]:gap-[4px_16px] [&&&&]:p-[8px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_>_strong]:[margin-right:auto]"
            }
            aria-label="所选鱼饵的记录"
          >
            <span
              className="fish-spot-stats-bait-icon block w-[24px] h-[24px] [&_:is(img,_svg)]:block [&_:is(img,_svg)]:w-[24px] [&_:is(img,_svg)]:h-[24px]"
              aria-hidden="true"
            >
              <BaitIcon
                key={bait.baitId}
                icon={context.catalog.itemIcons[bait.baitId]}
              />
            </span>
            <strong>
              {context.catalog.items[bait.baitId] || `物品 ${bait.baitId}`}
            </strong>
            <span>样本 {countText(bait.total)} 次</span>
            <span>钓获 {countText(bait.caught)} 次</span>
            <span>脱钩等失败 {percentage(bait.missed, bait.total)}</span>
            <span>单独脱钩率 —</span>
          </div>
          <div
            className={
              "fish-spot-stats-table-wrap max-h-[340px] overflow-auto [&&&&]:[scrollbar-gutter:stable] [&&&&]:[scrollbar-color:var(--ors-color-control-line)_transparent]"
            }
          >
            <table
              className={
                "fish-spot-stats-table w-full min-w-[390px] tabular-nums [&_:is(th,_td)]:border-b [&_:is(th,_td)]:border-solid [&_:is(th,_td)]:border-line [&_:is(th,_td):first-child]:pl-0 [&_:is(th,_td):not(:first-child)]:w-[112px] [&_:is(th,_td):not(:first-child)]:text-right [&_:is(th,_td):not(:first-child)]:whitespace-nowrap [&_th]:sticky [&_th]:bg-canvas [&_th]:text-muted [&_th]:text-[13px] [&_th]:font-medium [&_th]:text-left [&_td]:text-sm [&&&&]:[border-collapse:collapse] [&&&&_:is(th,_td)]:p-[5px_8px] [&&&&_th]:top-[0]"
              }
            >
              <thead>
                <tr>
                  <th scope="col">鱼</th>
                  <th scope="col">钓获占比</th>
                  <th scope="col">样本</th>
                </tr>
              </thead>
              <tbody>
                {bait.fish.map(({ fishId, reports }) => {
                  const fish = context.fishById.get(fishId);
                  const triggerId = `spot-stats-${spotId}-${fishId}`;
                  return (
                    <tr key={fishId}>
                      <td>
                        {fish ? (
                          <button
                            id={triggerId}
                            type="button"
                            className={
                              "fish-spot-stats-fish [.fishing-workspace_&]:inline-flex [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[8px] [.fishing-workspace_&]:min-h-[34px] [.fishing-workspace_&]:p-0 [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:text-left [&_span:last-child]:font-semibold [.fishing-workspace_&&&&]:[background:transparent]"
                            }
                            onClick={() =>
                              context.onOpen(fish, triggerId, spotId)
                            }
                          >
                            <FishIcon fish={fish} />
                            <span>{fish.name}</span>
                          </button>
                        ) : (
                          <span className="fish-spot-stats-unknown text-muted">
                            物品 {fishId}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{percentage(reports, bait.caught)}</strong>
                      </td>
                      <td>{countText(reports)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p
            className={
              "fish-spot-stats-note text-muted text-[13px] mt-[9px] [&&&&]:m-[3px_0_0]"
            }
          >
            Teamcraft
            社区记录。鱼的百分比以成功钓获为分母，并非每次抛竿的咬钩率。
            失败记录合并了脱钩等结果，无法单独算脱钩率；统计也未按时间和天气拆分。
          </p>
        </>
      )}
    </section>
  );
}
