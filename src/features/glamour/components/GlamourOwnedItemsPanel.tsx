/** Compact control for the encrypted, character-scoped owned-item index. */
import {
  ArrowClockwise,
  Backpack,
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { OwnedItemsState } from "../hooks/useOwnedItems";

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
      className={
        "owned-items-panel grid items-center gap-[16px] mt-[28px] rounded-[var(--ors-radius-control)] max-[700px]:gap-[12px] max-[700px]:mt-[20px] max-[700px]:p-[14px] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:p-[17px_18px] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_30%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_88%,_var(--ors-color-selected)_)] [@media(max-width:_700px)]:[&&&&]:grid-cols-[auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:[align-items:start]"
      }
      aria-labelledby="owned-items-title"
    >
      <div
        className="owned-items-mark grid place-items-center w-[46px] h-[46px] rounded-[var(--ors-radius-control)] text-accent bg-selected [&_svg]:w-[25px] [&_svg]:h-[25px] max-[700px]:w-[40px] max-[700px]:h-[40px]"
        aria-hidden="true"
      >
        <Backpack weight="duotone" />
      </div>
      <div
        className={
          "owned-items-copy min-w-0 [&_>_p]:text-muted [&_>_p]:text-xs [&_>_p_strong]:text-ink [&&&&_>_p]:m-[5px_0_0] [&&&&_>_p]:leading-[1.55]"
        }
      >
        <div
          className={
            "owned-items-heading flex items-baseline gap-[10px] [&_h2]:m-0 [&_>_span]:text-muted [&_>_span]:text-xs [&&&&_h2]:text-[15px]"
          }
        >
          <h2 className="text-lg font-semibold" id="owned-items-title">
            我的物品匹配
          </h2>
          {snapshot && (
            <span>{formatCacheTime(snapshot.capturedAtUnixMs)} 更新</span>
          )}
        </div>
        {snapshot ? (
          <>
            <p>
              已为 {snapshot.character.characterName} 匹配{" "}
              <strong>{viewModel.itemCount.toLocaleString("zh-CN")}</strong>{" "}
              件物品
              {!viewModel.metadataReady && !viewModel.metadataFailed
                ? "，正在整理同模信息"
                : viewModel.metadataFailed
                  ? "，当前仅显示精确持有状态"
                  : ""}
            </p>
            <div
              className={
                "owned-items-coverage flex flex-wrap mt-[9px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[4px] [&_>_span]:text-muted [&_>_span]:text-xs [&_svg]:w-[12px] [&_svg]:h-[12px] [&&&&]:gap-[6px_12px]"
              }
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
              <span className="owned-items-partial-warning block mt-[7px] text-danger text-xs">
                收藏柜物品资料暂不可用，其他来源仍可正常匹配。
              </span>
            )}
          </>
        ) : (
          <p>
            从当前游戏角色读取背包、兵装库、投影台和收藏柜，在幻化列表与详情中标出已持有装备。
          </p>
        )}
        {viewModel.error && (
          <div
            className={
              "owned-items-error grid items-center gap-[7px] mt-[10px] text-danger text-xs [&_>_svg]:w-[14px] [&_>_svg]:h-[14px] [&_button]:border-0 [&_button]:text-xs [&_button]:font-bold [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_button]:p-[2px_0] [&&&&_button]:[color:inherit] [&&&&_button]:[background:transparent]"
            }
            role="alert"
          >
            <WarningCircle weight="fill" />
            <span>{viewModel.error}</span>
            <button type="button" onClick={viewModel.dismissError}>
              关闭
            </button>
          </div>
        )}
      </div>
      <button
        className={
          "owned-items-action inline-flex items-center justify-center gap-[7px] min-w-[108px] min-h-[38px] border border-solid border-accent rounded-[var(--ors-radius-control)] text-accent text-xs whitespace-nowrap [&:hover:not(:disabled)]:bg-selected [&_svg]:w-[15px] [&_svg]:h-[15px] max-[700px]:w-full [&&&&]:p-[0_14px] [&&&&]:[background:transparent] [&&&&]:[font-weight:730] [&&&&:disabled]:[cursor:wait] [&&&&:disabled]:opacity-[0.62] [@media(max-width:_700px)]:[&&&&]:[grid-column:1_/_-1]"
        }
        type="button"
        disabled={loading}
        onClick={viewModel.requestSync}
      >
        {loading ? (
          <CircleNotch
            className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
          />
        ) : snapshot ? (
          <ArrowClockwise />
        ) : (
          <Backpack />
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
      className={
        complete
          ? "is-complete [.owned-items-coverage_&_svg]:text-accent"
          : "is-incomplete [.owned-items-coverage_&_svg]:text-danger"
      }
    >
      {complete ? <CheckCircle weight="fill" /> : <WarningCircle />}
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
