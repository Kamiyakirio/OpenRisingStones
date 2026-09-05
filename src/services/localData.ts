/** Clears backend credentials and browser-managed state for this application. */
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../shared/utils/runtime";

export async function clearAllLocalData() {
  if (isTauriRuntime()) await invoke("clear_all_local_data");

  let browserStorageFailed = false;
  for (const clearStorage of [
    () => window.localStorage.clear(),
    () => window.sessionStorage.clear(),
  ]) {
    try {
      clearStorage();
    } catch {
      browserStorageFailed = true;
    }
  }

  if (browserStorageFailed) {
    throw new Error("登录信息已清除，但部分应用本地数据无法删除");
  }
  window.location.reload();
}
