/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as mobxReact from "mobx-react-lite";
import * as PopperJS from "@popperjs/core";

export interface DropdownLabelProps {
  ref: (ref: HTMLElement | null) => void;
  expanded: boolean;
  toggle: () => void;
}

export interface DropdownPopperProps {
  toggle: () => void;
  labelElement: HTMLElement | null;
}

export interface DropdownProps {
  label: React.FunctionComponent<DropdownLabelProps>;
  popper: React.FunctionComponent<DropdownPopperProps>;
  placement: PopperJS.Placement;
  modifiers?: PopperJS.StrictModifiers[];
  strategy?: PopperJS.PositioningStrategy;
  outsideClickIgnoreSelector?: string;
}

export const Dropdown = mobxReact.observer<DropdownProps>((props) => {
  const [expanded, setExpanded] = React.useState(false);
  const [labelElement, setLabelElement] = React.useState<HTMLElement | null>(
    null,
  );
  const toggle = React.useCallback((e?: UIEvent) => {
    setExpanded((expanded) => !expanded);
    if (e) {
      e.stopPropagation();
    }
  }, []);
  React.useEffect(() => {
    if (!labelElement) return;
    const native = labelElement.matches("button, a[href], input");
    if (!native) {
      labelElement.tabIndex = 0;
      labelElement.setAttribute("role", "button");
    }
    if (
      !labelElement.getAttribute("aria-label") &&
      !labelElement.textContent?.trim()
    ) {
      const item = labelElement
        .closest("tr")
        ?.querySelector(".gears_name")
        ?.textContent?.trim();
      labelElement.setAttribute(
        "aria-label",
        item ? `${item}：装备选项` : "配装选项",
      );
    }
    labelElement.setAttribute("aria-haspopup", "dialog");
    labelElement.setAttribute("aria-expanded", String(expanded));
    const keyboard = (event: KeyboardEvent) => {
      if (!native && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        toggle();
      }
    };
    labelElement.addEventListener("keydown", keyboard);
    return () => labelElement.removeEventListener("keydown", keyboard);
  }, [expanded, labelElement, toggle]);
  return (
    <>
      {props.label({
        ref: setLabelElement,
        expanded,
        toggle,
      })}
      {expanded && (
        <DropdownPopper
          {...props}
          setExpanded={setExpanded}
          labelElement={labelElement}
          toggle={toggle}
        />
      )}
    </>
  );
});

const DropdownPopper = mobxReact.observer<
  DropdownProps & {
    setExpanded: (expanded: boolean) => void;
    labelElement: HTMLElement | null;
    toggle: () => void;
  }
>((props) => {
  const {
    popper,
    placement,
    modifiers = [],
    strategy = "fixed",
    setExpanded,
    labelElement,
    toggle,
  } = props;
  const [popperOptions] = React.useState({ placement, modifiers, strategy });
  const [popperElement, setPopperElement] = React.useState<HTMLElement | null>(
    null,
  );
  const popperContainer = document.getElementById("gearing-popper");
  React.useLayoutEffect(() => {
    if (labelElement === null || popperElement === null) return;
    if (popperOptions.strategy !== "fixed") {
      popperOptions.modifiers.push({
        name: "flip",
        options: { padding: { bottom: 50 } },
      });
    }
    const popperInstance = PopperJS.createPopper(
      labelElement,
      popperElement,
      popperOptions,
    );
    if (popperOptions.strategy === "fixed") {
      popperElement.style.zIndex = "20";
    }
    return () => popperInstance.destroy();
  }, [labelElement, popperElement, popperOptions]);
  React.useEffect(() => {
    if (document.activeElement === labelElement) {
      popperElement
        ?.querySelector<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        )
        ?.focus();
    }
  }, [labelElement, popperElement]);
  React.useEffect(() => {
    const onGlobalClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && labelElement && popperElement) {
        if (
          !labelElement.contains(target) &&
          !popperElement.contains(target) &&
          (props.outsideClickIgnoreSelector === undefined ||
            target.closest(props.outsideClickIgnoreSelector) === null)
        ) {
          setExpanded(false);

          (
            e as MouseEvent & { _isClosingDropdown?: boolean }
          )._isClosingDropdown = true;
        }
      }
    };
    const onGlobalKeyup = (e: KeyboardEvent) => {
      const target = e.target as Element;
      // Escape closes the active panel even when focus has moved into its fields.
      if (
        target &&
        (target === labelElement || popperElement?.contains(target)) &&
        e.key === "Escape"
      ) {
        setExpanded(false);
        labelElement?.focus();
      }
    };
    window.addEventListener("click", onGlobalClick, true);
    window.addEventListener("keyup", onGlobalKeyup, true);
    return () => {
      window.removeEventListener("click", onGlobalClick, true);
      window.removeEventListener("keyup", onGlobalKeyup, true);
    };
  }, [
    labelElement,
    popperElement,
    props.outsideClickIgnoreSelector,
    setExpanded,
  ]);
  return (
    popperContainer &&
    ReactDOM.createPortal(
      <div
        ref={setPopperElement}
        role="dialog"
        aria-label={labelElement?.textContent?.trim() || "配装选项"}
        onClick={(e) => e.stopPropagation()}
        children={React.createElement(popper, { toggle, labelElement })}
      />,
      popperContainer,
    )
  );
});
