/** Native controls preserve business component contracts without Material/Sass runtime. */
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
  type ComponentProps,
  type Ref,
} from "react";
export type ButtonProps = Omit<ComponentProps<"button">, "onClick"> & {
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
};
export function Button({
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} className={`gear-button ${className}`} />
  );
}
export function TextField({
  className = "",
  inputRef,
  ...props
}: ComponentProps<"input"> & { inputRef?: Ref<HTMLInputElement> }) {
  return (
    <input {...props} ref={inputRef} className={`gear-input ${className}`} />
  );
}
export function Radio({
  label,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="gear-choice">
      <input {...props} type="radio" />
      {label}
    </label>
  );
}
export function Switch({
  label,
  ...props
}: ComponentProps<"input"> & { label?: ReactNode }) {
  return (
    <label className="gear-choice">
      <input {...props} type="checkbox" role="switch" />
      {label}
    </label>
  );
}
export function Badge({
  exited,
  className = "",
}: {
  exited?: boolean;
  className?: string;
}) {
  return exited ? null : (
    <span className={`gear-badge ${className}`} aria-label="新功能" />
  );
}
export function LinearProgress({ closed }: { closed?: boolean }) {
  return closed ? null : (
    <progress className="gear-progress" aria-label="正在加载装备" />
  );
}
export function Tab({ children, ...props }: ComponentProps<"button">) {
  return (
    <button {...props} type="button" role="tab">
      {children}
    </button>
  );
}
export function TabBar({
  children,
  activeTabIndex,
  onActivate,
}: {
  children: ReactNode;
  activeTabIndex: number;
  onActivate: (event: { detail: { index: number } }) => void;
}) {
  const id = useId();
  return (
    <div
      className="gear-tabs"
      role="tablist"
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        const buttons = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]"),
        );
        const index =
          (activeTabIndex +
            (e.key === "ArrowRight" ? 1 : -1) +
            buttons.length) %
          buttons.length;
        e.preventDefault();
        onActivate({ detail: { index } });
        buttons[index]?.focus();
      }}
    >
      {Children.map(children, (child, index) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<ComponentProps<"button">>, {
              id: `${id}-${index}`,
              "aria-selected": index === activeTabIndex,
              tabIndex: index === activeTabIndex ? 0 : -1,
              onClick: () => onActivate({ detail: { index } }),
            })
          : child,
      )}
    </div>
  );
}
export function Ripple({
  children,
}: {
  children: ReactNode;
  surface?: boolean;
  unbounded?: boolean;
}) {
  return <>{children}</>;
}
export function RippleSurface({ className }: { className?: string }) {
  return <span className={className} aria-hidden="true" />;
}
export function CollapsibleList({
  handle,
  children,
  defaultOpen,
}: {
  handle: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <li className="gear-collapse">
      <details open={defaultOpen}>
        <summary>{handle}</summary>
        {children}
      </details>
    </li>
  );
}
