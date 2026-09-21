/** Installs the packaged WebView policy while preserving browser and debug tooling. */
import { isTauriRuntime } from "./runtime.ts";

export function installReleaseContextMenuGuard() {
  const isReleaseBuild =
    typeof __DEBUG_BUILD__ !== "undefined" && !__DEBUG_BUILD__;
  if (!isReleaseBuild || !isTauriRuntime()) return;

  document.addEventListener("contextmenu", (event) => event.preventDefault());
}
