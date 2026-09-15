/** Select the isolated timer before mounting application services or navigation. */
import { lazy, Suspense } from "react";
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
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <View />
    </Suspense>
  );
}
