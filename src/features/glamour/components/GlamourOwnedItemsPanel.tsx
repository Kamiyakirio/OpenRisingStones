/** Compact control for the encrypted, character-scoped owned-item index. */
import clsx from "clsx";
import {
  ArrowClockwise,
  Backpack,
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { OwnedItemsState } from "../hooks/useOwnedItems";

/** Reused presentation strings stay static and are allocated once for this module. */
const ownedItemsDescriptionClasses =
  "mx-0 mt-[5px] mb-0 text-xs leading-[1.55] text-muted";

type GlamourOwnedItemsPanelProps = {
  viewModel: OwnedItemsState;
};
export function GlamourOwnedItemsPanel({
  viewModel,
}: GlamourOwnedItemsPanelProps) {
  const { snapshot } = viewModel;
  const loading =
    viewModel.status === "loading_cache" || viewModel.status === "syncing";
  return (
    <section
      className="owned-items-panel mt-7 grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-4 rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-surface)_88%,_var(--ors-color-selected)_)] px-4.5 py-[17px] [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_30%,_var(--ors-color-line))] max-[700px]:mt-5 max-[700px]:grid-cols-[auto_minmax(0,_1fr)] max-[700px]:items-start max-[700px]:gap-3 max-[700px]:p-3.5"
      aria-labelledby="owned-items-title"
    >
      <div
        className="owned-items-mark grid h-11.5 w-11.5 place-items-center rounded-control bg-selected text-accent max-[700px]:h-10 max-[700px]:w-10"
        aria-hidden="true"
      >
        <Backpack className="h-[25px] w-[25px]" weight="duotone" />
      </div>
      <div className="owned-items-copy min-w-0">
        <div className="owned-items-heading flex items-baseline gap-2.5">
          <h2
            className="m-0 text-lg text-[15px] font-semibold"
            id="owned-items-title"
          >
            我的物品匹配
          </h2>
          {snapshot && (
            <span className="text-xs text-muted">
              {formatCacheTime(snapshot.capturedAtUnixMs)} 更新
            </span>
          )}
        </div>
        {snapshot ? (
          <>
            <p className={ownedItemsDescriptionClasses}>
              已为 {snapshot.character.characterName} 匹配{" "}
              <strong className="text-ink">
                {viewModel.itemCount.toLocaleString("zh-CN")}
              </strong>{" "}
              件物品
              {!viewModel.metadataReady && !viewModel.metadataFailed
                ? "，正在整理同模信息"
                : viewModel.metadataFailed
                  ? "，当前仅显示精确持有状态"
                  : ""}
            </p>
            <div
              className="owned-items-coverage mt-[9px] flex flex-wrap gap-[6px_12px]"
              aria-label="物品来源读取状态"
            >
              <CoverageLabel
                label="背包"
                complete={snapshot.inventory.loaded}
              />
              <CoverageLabel
                label="兵装库"
                complete={snapshot.armouryChest.loaded}
              />
              <CoverageLabel
                label="投影台"
                complete={snapshot.glamourDresser.loaded}
                cached={snapshot.glamourDresser.mayBeStale}
              />
              <CoverageLabel
                label="收藏柜"
                complete={
                  snapshot.armoire.cached && !viewModel.armoireMappingFailed
                }
                cached={snapshot.armoire.mayBeStale}
              />
            </div>
            {viewModel.armoireMappingFailed && (
              <span className="owned-items-partial-warning mt-[7px] block text-xs text-danger">
                收藏柜物品资料暂不可用，其他来源仍可正常匹配。
              </span>
            )}
          </>
        ) : (
          <p className={ownedItemsDescriptionClasses}>
            从当前游戏角色读取背包、兵装库、投影台和收藏柜，在幻化列表与详情中标出已持有装备。
          </p>
        )}
        {viewModel.error && (
          <div
            className="owned-items-error mt-2.5 grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[7px] text-xs text-danger"
            role="alert"
          >
            <WarningCircle className="h-3.5 w-3.5" weight="fill" />
            <span>{viewModel.error}</span>
            <button
              className="min-h-9 border-0 bg-transparent px-0 py-0.5 text-xs font-bold text-[inherit] transition-[background-color,color,border-color] duration-120 ease-[ease] pointer-coarse:min-h-11"
              type="button"
              onClick={viewModel.dismissError}
            >
              关闭
            </button>
          </div>
        )}
      </div>
      <button
        className="owned-items-action inline-flex min-h-9.5 min-w-27 items-center justify-center gap-[7px] rounded-control border border-solid border-accent bg-transparent px-3.5 py-0 text-xs font-[730] whitespace-nowrap text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-selected disabled:[cursor:wait] disabled:opacity-62 max-[700px]:col-span-full max-[700px]:w-full"
        type="button"
        disabled={loading}
        onClick={viewModel.requestSync}
      >
        {loading ? (
          <CircleNotch className="spin h-[15px] w-[15px] animate-[login-spin_900ms_linear_infinite]" />
        ) : snapshot ? (
          <ArrowClockwise className="h-[15px] w-[15px]" />
        ) : (
          <Backpack className="h-[15px] w-[15px]" />
        )}
        {viewModel.status === "loading_cache"
          ? "正在读取缓存"
          : viewModel.status === "syncing"
            ? "正在读取游戏"
            : snapshot
              ? "更新物品"
              : "同步物品"}
      </button>
    </section>
  );
}
function CoverageLabel({
  label,
  complete,
  cached = false,
}: {
  label: string;
  complete: boolean;
  cached?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs text-muted",
        complete ? "is-complete" : "is-incomplete",
      )}
    >
      {complete ? (
        <CheckCircle className="h-3 w-3 text-danger" weight="fill" />
      ) : (
        <WarningCircle className="h-3 w-3 text-danger" />
      )}
      {label}
      {complete && cached ? "缓存" : complete ? "已读取" : "未读取"}
    </span>
  );
}
function formatCacheTime(timestamp: number) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "此前";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
