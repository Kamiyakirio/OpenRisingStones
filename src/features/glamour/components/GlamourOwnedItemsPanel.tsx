/** Compact control for the encrypted, character-scoped owned-item index. */
import {
  ArrowClockwise,
  Backpack,
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { OwnedItemsViewModel } from "../hooks/useOwnedItems";
import "./GlamourOwnedItemsPanel.css";

type GlamourOwnedItemsPanelProps = {
  viewModel: OwnedItemsViewModel;
};

export function GlamourOwnedItemsPanel({
  viewModel,
}: GlamourOwnedItemsPanelProps) {
  const { snapshot } = viewModel;
  const loading =
    viewModel.status === "loading_cache" || viewModel.status === "syncing";

  return (
    <section className="owned-items-panel" aria-labelledby="owned-items-title">
      <div className="owned-items-mark" aria-hidden="true">
        <Backpack weight="duotone" />
      </div>
      <div className="owned-items-copy">
        <div className="owned-items-heading">
          <h2 id="owned-items-title">我的物品匹配</h2>
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
            <div className="owned-items-coverage" aria-label="物品来源读取状态">
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
              <span className="owned-items-partial-warning">
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
          <div className="owned-items-error" role="alert">
            <WarningCircle weight="fill" />
            <span>{viewModel.error}</span>
            <button type="button" onClick={viewModel.dismissError}>
              关闭
            </button>
          </div>
        )}
      </div>
      <button
        className="owned-items-action"
        type="button"
        disabled={loading}
        onClick={viewModel.requestSync}
      >
        {loading ? (
          <CircleNotch className="spin" />
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
    <span className={complete ? "is-complete" : "is-incomplete"}>
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
