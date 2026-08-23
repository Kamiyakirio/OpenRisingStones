/** Primary navigation, theme control, and account entry point. */
import {
  Bell,
  Moon,
  Sparkle,
  Sun,
  UserCircle,
  UserCircleCheck,
} from "@phosphor-icons/react";
import type { LoginProfile } from "../services/sdoLogin";

type AppHeaderProps = {
  dark: boolean;
  profile: LoginProfile | null;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
};

export function AppHeader({
  dark,
  profile,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
}: AppHeaderProps) {
  return (
    <header className="site-header">
      <button
        className="brand brand-button"
        type="button"
        aria-label="返回 OpenRisingStone 首页"
        onClick={onGoHome}
      >
        <span className="brand-mark">
          <Sparkle weight="fill" />
        </span>
        <span>
          <strong>OpenRisingStone</strong>
          <small>GLAMOUR</small>
        </span>
      </button>
      <nav className="main-nav" aria-label="主导航">
        <a className="active" href="#discover">
          推荐
        </a>
        <a href="#wardrobe">衣橱</a>
        <a href="#collections">收藏夹</a>
      </nav>
      <div className="header-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={dark ? "切换浅色主题" : "切换深色主题"}
          onClick={onToggleTheme}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
        <button
          className="icon-button notification"
          type="button"
          aria-label="消息通知"
        >
          <Bell />
        </button>
        <button
          className={
            profile ? "profile-button authenticated" : "profile-button"
          }
          type="button"
          onClick={onOpenLogin}
        >
          {profile ? <UserCircleCheck weight="fill" /> : <UserCircle />}
          {profile ? profile.characterName || profile.displayAccount : "登录"}
        </button>
      </div>
    </header>
  );
}
