/** Primary navigation, theme control, and authenticated account menu. */
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  GearSix,
  Moon,
  SignOut,
  Sparkle,
  SpinnerGap,
  Sun,
  UserCircle,
  UserCircleCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import type { LoginProfile } from "../models/auth";

type AppHeaderProps = {
  dark: boolean;
  feature: "glamour" | "recruit";
  profile: LoginProfile | null;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLogout: () => Promise<void>;
};

export function AppHeader({
  dark,
  feature,
  profile,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLogout,
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
          <small>{feature === "recruit" ? "RECRUIT" : "GLAMOUR"}</small>
        </span>
      </button>
      <nav className="main-nav" aria-label="主导航">
        {feature === "recruit" ? (
          <a className="active" href="#recruit-list">
            招募大厅
          </a>
        ) : (
          <>
            <a className="active" href="#discover">
              推荐
            </a>
            <a href="#wardrobe">衣橱</a>
            <a href="#collections">收藏夹</a>
          </>
        )}
      </nav>
      <div className="header-actions">
        <button
          className="icon-button"
          type="button"
          aria-label="打开设置"
          onClick={onOpenSettings}
        >
          <GearSix />
        </button>
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
        {profile ? (
          <AuthenticatedAccountEntry profile={profile} onLogout={onLogout} />
        ) : (
          <button
            className="profile-button"
            type="button"
            onClick={onOpenLogin}
          >
            <UserCircle />
            登录
          </button>
        )}
      </div>
    </header>
  );
}

function AuthenticatedAccountEntry({
  profile,
  onLogout,
}: {
  profile: LoginProfile;
  onLogout: () => Promise<void>;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const account = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!account.current?.contains(event.target as Node)) {
        setAccountOpen(false);
        setLogoutError(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setLogoutError(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await onLogout();
      setAccountOpen(false);
      setLoggingOut(false);
    } catch (reason) {
      setLogoutError(readLogoutError(reason));
      setLoggingOut(false);
    }
  };

  return (
    <div className="account-entry" ref={account}>
      <button
        className="profile-button authenticated"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        aria-controls="account-menu"
        onClick={() => {
          setAccountOpen((current) => !current);
          setLogoutError(null);
        }}
      >
        <UserCircleCheck weight="fill" />
        <span>{profile.characterName || profile.displayAccount}</span>
      </button>
      {accountOpen && (
        <AccountMenu
          profile={profile}
          loggingOut={loggingOut}
          error={logoutError}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

function AccountMenu({
  profile,
  loggingOut,
  error,
  onLogout,
}: {
  profile: LoginProfile;
  loggingOut: boolean;
  error: string | null;
  onLogout: () => Promise<void>;
}) {
  const location = [profile.areaName, profile.groupName]
    .filter(Boolean)
    .join(" / ");

  return (
    <section
      className="account-menu"
      id="account-menu"
      role="dialog"
      aria-label="当前账号信息"
    >
      <div className="account-menu-identity">
        <UserCircleCheck weight="duotone" />
        <div>
          <span>当前登录角色</span>
          <strong>{profile.characterName || profile.displayAccount}</strong>
        </div>
      </div>
      <dl className="account-menu-details">
        <div>
          <dt>盛趣账号</dt>
          <dd>{profile.displayAccount}</dd>
        </div>
        <div>
          <dt>大区 / 服务器</dt>
          <dd>{location || "未提供"}</dd>
        </div>
      </dl>
      <button
        className="account-logout"
        type="button"
        disabled={loggingOut}
        onClick={() => void onLogout()}
      >
        {loggingOut ? (
          <>
            <SpinnerGap className="spin" />
            正在退出
          </>
        ) : (
          <>
            <SignOut />
            退出登录
          </>
        )}
      </button>
      {error && (
        <div className="account-menu-error" role="alert">
          <WarningCircle weight="fill" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

function readLogoutError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法退出登录，请稍后重试";
}
