import { copyGearingText } from "../utils/clipboard.ts";
/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as mobxReact from "mobx-react-lite";
import { useStore } from "./contexts.tsx";
import { RippleLazy } from "./RippleLazy.tsx";
import { Icon } from "./Icon.tsx";
import type { DropdownPopperProps } from "./Dropdown.tsx";

export const SummaryMenu = mobxReact.observer<{
  toggle: DropdownPopperProps["toggle"];
}>(({ toggle }) => {
  const store = useStore();
  return (
    <div className="summary-menu card">
      <RippleLazy>
        <a
          className="gear-menu_item"
          href={`http://garlandtools.cn/db/${store.garlandGroup}`}
          target="garlandtools"
          tabIndex={0}
        >
          在 Garland 数据 中以工具组查看{" "}
          <Icon className="gear-menu_external" name="open-in-new" />
        </a>
      </RippleLazy>
      <div className="gear-menu_divider" />
      <RippleLazy>
        <div
          className="gear-menu_item"
          onClick={() => {
            toggle();
            copyGearingText(store.equippedStatsText);
          }}
        >
          复制套装总属性值
        </div>
      </RippleLazy>
    </div>
  );
});
