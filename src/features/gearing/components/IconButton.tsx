/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as React from "react";
import classNames from "clsx";
import { RippleLazy } from "./RippleLazy.tsx";
import { Icon } from "./Icon.tsx";

export interface IconButtonProps extends React.HTMLProps<HTMLButtonElement> {
  icon: string;
}

export const IconButton = React.memo<IconButtonProps>((props) => {
  const { icon, className, ...rest } = props;
  return (
    <RippleLazy unbounded surfaceClass="mdc-icon-button__ripple">
      <button
        {...rest}
        className={classNames(
          "mdc-icon-button",
          "mdc-icon-button--dense",
          className,
        )}
        type="button"
        children={<Icon className="mdc-icon-button__icon" name={icon} />}
      />
    </RippleLazy>
  );
});
