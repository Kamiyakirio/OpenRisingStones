/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as mobxReact from "mobx-react-lite";
import * as G from "../utils/game.ts";
import { useStore } from "./contexts.tsx";
import { RippleLazy } from "./RippleLazy.tsx";
import type { DropdownPopperProps } from "./Dropdown.tsx";

export const ClanPanel = mobxReact.observer<DropdownPopperProps>(
  ({ toggle }) => {
    const store = useStore();
    return (
      <div className="clan card">
        <table>
          <tbody>
            {G.races.map((raceName, i) => (
              <tr key={i}>
                <td className="clan_race">{raceName}</td>
                {[i * 2, i * 2 + 1].map((clan) => (
                  <td key={clan}>
                    <RippleLazy>
                      <div
                        className="clan_item"
                        onClick={() => {
                          store.setClan(clan);
                          toggle();
                        }}
                        children={G.clans[clan]}
                      />
                    </RippleLazy>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);
