/** Add keyboard activation to retained span-based business controls. */
import { cloneElement, type ReactElement, type HTMLAttributes } from "react";
export function RippleLazy({
  children,
}: {
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  surfaceClass?: string;
  unbounded?: boolean;
}) {
  if (
    !children.props.onClick ||
    ["button", "a", "input"].includes(String(children.type))
  )
    return children;
  return cloneElement(children, {
    role: "button",
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    },
  });
}
