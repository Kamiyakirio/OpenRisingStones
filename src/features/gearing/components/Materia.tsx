/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as mobxReact from "mobx-react-lite";
import classNames from "clsx";
import type { IMateria } from "../models/index.ts";
import { useStore } from "./contexts.tsx";
import { Dropdown } from "./Dropdown.tsx";
import { MateriaPanel } from "./MateriaPanel.tsx";

export const Materia = mobxReact.observer<{ materia: IMateria }>(
  ({ materia }) => {
    const store = useStore();
    return (
      <Dropdown
        label={({ ref, expanded, toggle }) => (
          <span
            ref={ref}
            className={classNames(
              "gears_materia",
              materia.isAdvanced ? "-advanced" : "-normal",
              expanded && "-active",
            )}
            onClick={store.isViewing ? undefined : toggle}
            onContextMenu={
              store.isViewing
                ? undefined
                : (e) => {
                    if (!document.getSelection()?.toString()) {
                      e.preventDefault();
                      materia.meld(undefined);
                    }
                  }
            }
            children={materia.name}
          />
        )}
        popper={({ labelElement }) => (
          <MateriaPanel materia={materia} labelElement={labelElement} />
        )}
        placement="bottom-start"
        modifiers={[
          {
            name: "offset",
            options: { offset: [-104 - materia.index * 50, 0] },
          },
        ]}
      />
    );
  },
);
