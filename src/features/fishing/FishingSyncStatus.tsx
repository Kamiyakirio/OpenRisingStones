/** Show live or saved game-log status and provide a manual refresh action. */
import { ArrowsClockwise } from "@phosphor-icons/react";
import { restartAsAdministrator } from "../../shared/game-bridge/api";
import type { useFishing } from "./useFishing";

export function FishingSyncStatus({
  vm,
  catalogLength,
  elevationFailed,
  onElevationFailedChange,
}: {
  vm: ReturnType<typeof useFishing>;
  catalogLength: number;
  elevationFailed: boolean;
  onElevationFailedChange: (failed: boolean) => void;
}) {
  const debugAccessDenied =
    __DEBUG_BUILD__ && vm.gameLogStatus === "access-denied";
  const gameUnmapped = catalogLength - vm.gameCoveredIds.size;
  const savedGameLogTime = vm.gameLogCapturedAt
    ? new Date(vm.gameLogCapturedAt).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  if (!vm.desktop) return null;
  return (
    <div className="fish-sync" role="status">
      <span
        className="fish-sync-indicator"
        data-ready={vm.gameLogStatus === "ready"}
      />
      <div>
        <strong>
          {vm.gameLog
            ? `${vm.gameLog.characterName} · ${vm.gameLogStatus === "ready" || vm.gameLogStorageError ? "游戏图鉴" : "已保存的游戏图鉴"}`
            : "游戏图鉴"}
        </strong>
        <span>
          {vm.gameLogStatus === "ready"
            ? `已从游戏读取 ${vm.gameCaughtCount} 条已钓记录；${vm.gameLogStorageError ? "保存失败" : "已保存到本机"}。${gameUnmapped} 条图鉴外鱼需手动记录。`
            : vm.gameLogStatus === "unsupported"
              ? "自动读取仅支持 Windows 桌面版。"
              : vm.gameLogStatus === "access-denied"
                ? debugAccessDenied
                  ? "调试模式下请关闭应用，在管理员终端运行 npm run tauri dev 后重试。"
                  : elevationFailed
                    ? "Windows 未能以管理员身份重启应用，请检查权限后重试。"
                    : "Windows 拒绝读取游戏进程，请以管理员身份重启应用后重试。"
                : vm.gameLogStatus === "multiple-processes"
                  ? "检测到多个游戏进程，请只保留一个后重新读取。"
                  : vm.gameLogStatus === "unsupported-version"
                    ? "当前游戏版本无法读取图鉴，请更新应用后重试。"
                    : vm.gameLogStatus === "error"
                      ? "读取游戏图鉴失败，请重试。"
                      : vm.gameLogStatus === "syncing"
                        ? "正在读取当前角色的图鉴…"
                        : vm.gameLog
                          ? "进入游戏角色后自动更新。"
                          : "进入游戏角色后自动读取；当前显示本机标记。"}
          {vm.gameLogStatus !== "ready" && savedGameLogTime
            ? ` 当前显示 ${savedGameLogTime} ${vm.gameLogStorageError ? "读取的图鉴；本次未保存" : "保存的图鉴"}。`
            : null}
        </span>
      </div>
      {!debugAccessDenied && (
        <button
          type="button"
          onClick={() => {
            if (vm.gameLogStatus === "access-denied") {
              onElevationFailedChange(false);
              void restartAsAdministrator().catch(() =>
                onElevationFailedChange(true),
              );
            } else {
              void vm.refreshGameLog();
            }
          }}
          disabled={
            vm.gameLogStatus === "syncing" || vm.gameLogStatus === "unsupported"
          }
        >
          <ArrowsClockwise aria-hidden="true" />
          {vm.gameLogStatus === "access-denied"
            ? "以管理员身份重启"
            : "重新读取"}
        </button>
      )}
    </div>
  );
}
