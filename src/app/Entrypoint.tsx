/** Select the isolated timer before mounting application services or navigation. */
import { lazy, Suspense } from "react";
import { LoadingPage } from "./components/LoadingPage";

/** Use the saved theme before the lazy application or timer window mounts. */
function savedThemeIsDark() {
  try {
    return localStorage.getItem("ors.theme") === "dark";
  } catch {
    return false;
  }
}

const View =
  new URLSearchParams(location.search).get("window") === "fishing-timer"
    ? lazy(() =>
        import("../features/fishing/timer/FishingTimerWindow").then(
          (module) => ({ default: module.FishingTimerWindow }),
        ),
      )
    : lazy(() => import("./App"));
export function Entrypoint() {
  return (
    <Suspense
      fallback={
        <LoadingPage message="正在加载…" fullscreen dark={savedThemeIsDark()} />
      }
    >
      <View />
    </Suspense>
  );
}
