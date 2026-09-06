/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as mobxReact from "mobx-react-lite";
import classNames from "clsx";
import { Button } from "./Controls.tsx";
import { Badge } from "./Controls.tsx";
import { useStore } from "./contexts.tsx";

type Props<T> = T extends (props: infer P, ...args: never[]) => unknown
  ? P
  : never;

export interface BadgeButtonProps extends Props<typeof Button> {
  promotion: string;
}

export const BadgeButton = mobxReact.observer<BadgeButtonProps>((props) => {
  const { promotion, className, onClick, children, ...rest } = props;
  const store = useStore();
  return (
    <Button
      {...rest}
      className={classNames(className, "badge-button")}
      onClick={() => {
        store.promotion.off(promotion);
        return onClick?.();
      }}
    >
      {children}
      <Badge
        className="badge-button_badge"
        exited={!store.promotion.get(promotion)}
      />
    </Button>
  );
});
