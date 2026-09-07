/** Glamour-specific copy delegates all fullscreen presentation to the auth boundary. */
import { AuthenticationGate } from "../../auth/components/AuthenticationGate";

type GlamourLoginWallProps = {
  checking: boolean;
  expired: boolean;
  onLogin: () => void;
  onGoHome: () => void;
};
export function GlamourLoginWall(props: GlamourLoginWallProps) {
  return (
    <AuthenticationGate
      {...props}
      feature="幻化"
      description="登录后可浏览石之家幻化投稿和装备详情。"
    />
  );
}
