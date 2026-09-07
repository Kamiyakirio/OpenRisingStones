/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as mobxReact from "mobx-react-lite";
import type { IStore } from "../models/index.ts";
import { StoreContext } from "./contexts.tsx";
import { Loading } from "./Loading.tsx";
import { Slot } from "./Slot.tsx";
import { SlotCompact } from "./SlotCompact.tsx";
import { Condition } from "./Condition.tsx";
import { Summary } from "./Summary.tsx";
import { About } from "./About.tsx";
import { trackGearingInputBlur } from "./GearRow.tsx";
import { gearDataError } from "../api/gearData.ts";

export const GearingWorkspace = mobxReact.observer<{ store: IStore }>(
  ({ store }) => {
    return (
      <StoreContext.Provider value={store}>
        <div
          className={`gearing-surface ${store.setting.appTheme === "dark" ? "gearing-dark" : ""}`}
          onBlurCapture={trackGearingInputBlur}
        >
          <Loading />
          {gearDataError.get() && (
            <p role="alert">装备数据加载失败，请重新进入配装重试。</p>
          )}
          {store.loadingStatus !== "loading" && (
            <div
              className={`gearing-app gearing-app-${store.mode}${store.job === undefined ? " gearing-app-welcome" : ""}`}
            >
              <Condition />
              <div
                className="gearing-table-scroll"
                role="region"
                aria-label="装备列表"
                tabIndex={0}
              >
                {store.job !== undefined &&
                  (store.isViewing ? (
                    <SlotCompact />
                  ) : (
                    store.schema.slots.map((slot) => (
                      <Slot key={slot.slot} slot={slot} />
                    ))
                  ))}
                <About />
              </div>
              {store.job !== undefined && <Summary />}
              <div id="gearing-popper" />
            </div>
          )}
        </div>
      </StoreContext.Provider>
    );
  },
);
