/** Shared application identity, navigation, theme, and account controls. */
import clsx from "clsx";

import { featureColorClasses } from "../../shared/styles/workspaceColors";
import {
  ChatCircleDots,
  Aperture,
  Bug,
  CoatHanger,
  FishSimple,
  GearSix,
  House,
  MapTrifold,
  ClipboardText,
  Moon,
  Sword,
  Sun,
  SignOut,
  SpinnerGap,
  UserCircle,
  UserCircleCheck,
  UsersThree,
  WarningCircle,
  SquaresFour,
} from "@phosphor-icons/react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LoginProfile } from "../../features/auth/types";
import type { ActiveFeature } from "../hooks/useAppController";

/** Reused presentation strings stay static and are allocated once for this module. */
const navigationGroupClasses =
  "navigation-group px-3 pt-3 pb-1 text-xs font-semibold text-muted max-[899px]:hidden";
const headerActionClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] pointer-coarse:min-w-11 icon-button flex min-h-11 w-full items-center justify-start gap-3 rounded-control border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted no-underline hover:bg-hover hover:text-ink max-[899px]:size-11 max-[899px]:min-h-11 max-[899px]:w-auto max-[899px]:min-w-11 max-[899px]:justify-center max-[899px]:p-2";

type AppHeaderProps = {
  dark: boolean;
  feature: ActiveFeature;
  profile: LoginProfile | null;
  onNavigate: (feature: ActiveFeature) => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLogout: () => Promise<void>;
};
export function AppHeader({
  dark,
  feature,
  profile,
  onNavigate,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLogout,
}: AppHeaderProps) {
  const navigation = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    navigation.current?.querySelector('[aria-current="page"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [feature]);
  const destinations: Array<[ActiveFeature, string, typeof House]> = [
    ["home", "首页", House],
    ["recruit", "招募", UsersThree],
    ["glamour", "幻化", CoatHanger],
    ["teleport", "超域传送", MapTrifold],
    ["gearing", "配装", Sword],
    ["fishing", "钓鱼数据库", FishSimple],
    ["chat", "手机聊天", ChatCircleDots],
    ["portrait", "肖像助手", Aperture],
    ["mentor", "导随记录", ClipboardText],
  ];
  if (__DEBUG_BUILD__) destinations.push(["debug", "调试", Bug]);
  return (
    <header className="app-header sticky top-0 z-20 flex h-dvh min-w-0 flex-col border-r border-line bg-surface max-[899px]:grid max-[899px]:h-auto max-[899px]:grid-cols-[minmax(0,1fr)_auto] max-[899px]:border-r-0 max-[899px]:border-b">
      <div className="app-header-bar flex h-14 min-w-0 shrink-0 items-center border-b border-line px-4 max-[899px]:h-14 max-[899px]:border-0 max-[899px]:px-4">
        <a
          className="app-brand flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight whitespace-nowrap text-ink no-underline max-[519px]:text-xs"
          href="#home"
          onClick={(event) => {
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onNavigate("home");
            }
          }}
        >
          <SquaresFour
            className="size-6 shrink-0 text-brand"
            weight="fill"
            aria-hidden="true"
          />
          <span className="truncate">OpenRisingStones</span>
        </a>
      </div>
      <nav
        className="app-navigation flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 max-[899px]:col-span-2 max-[899px]:row-start-2 max-[899px]:flex-row max-[899px]:gap-1 max-[899px]:overflow-x-auto max-[899px]:border-t max-[899px]:border-line max-[899px]:px-3 max-[899px]:py-2"
        ref={navigation}
        aria-label="应用导航"
      >
        {destinations.map(([key, label, Icon]) => (
          <Fragment key={key}>
            {key === "recruit" && (
              <span className={navigationGroupClasses}>社区与资料</span>
            )}
            {key === "chat" && (
              <span className={navigationGroupClasses}>游戏工具</span>
            )}
            {key === "debug" && (
              <span className={navigationGroupClasses}>开发</span>
            )}
            <a
              className={clsx(
                "group/nav-item flex min-h-11 items-center gap-3 rounded-control border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted no-underline hover:bg-hover hover:text-ink aria-[current=page]:border-control aria-[current=page]:bg-hover aria-[current=page]:bg-selected aria-[current=page]:font-semibold aria-[current=page]:text-ink max-[899px]:shrink-0 max-[899px]:gap-2 max-[899px]:px-3 max-[519px]:px-2 max-[519px]:text-xs",
                featureColorClasses,
              )}
              data-feature={key}
              href={`#${key}`}
              aria-current={feature === key ? "page" : undefined}
              onClick={(event) => {
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  onNavigate(key);
                }
              }}
            >
              <Icon
                className="size-5 shrink-0 text-muted group-aria-[current=page]/nav-item:text-tool"
                aria-hidden="true"
              />
              <span>{label}</span>
            </a>
          </Fragment>
        ))}
      </nav>
      <div className="header-actions grid shrink-0 gap-1 border-t border-line bg-canvas p-3 max-[899px]:col-start-2 max-[899px]:row-start-1 max-[899px]:flex max-[899px]:items-center max-[899px]:gap-1 max-[899px]:border-0 max-[899px]:bg-transparent max-[899px]:p-2">
        <button
          className={headerActionClasses}
          type="button"
          aria-label={dark ? "切换浅色主题" : "切换深色主题"}
          title={dark ? "切换浅色主题" : "切换深色主题"}
          onClick={onToggleTheme}
        >
          {dark ? (
            <Sun className="size-5 shrink-0" />
          ) : (
            <Moon className="size-5 shrink-0" />
          )}
          <span className="max-[899px]:hidden">主题</span>
        </button>
        <button
          className={headerActionClasses}
          type="button"
          aria-label="打开设置"
          title="设置"
          onClick={onOpenSettings}
        >
          <GearSix className="size-5 shrink-0" />
          <span className="max-[899px]:hidden">设置</span>
        </button>
        {profile ? (
          <AuthenticatedAccountEntry profile={profile} onLogout={onLogout} />
        ) : (
          <button
            className="profile-button flex min-h-11 w-full items-center justify-start gap-3 rounded-control border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted no-underline transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink max-[899px]:size-11 max-[899px]:min-h-11 max-[899px]:w-auto max-[899px]:min-w-11 max-[899px]:justify-center max-[899px]:p-2 pointer-coarse:min-w-11"
            type="button"
            aria-label="登录"
            title="登录"
            onClick={onOpenLogin}
          >
            <UserCircle className="size-5 shrink-0" />
            <span className="min-w-0 truncate max-[899px]:hidden">登录</span>
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
    <div className="account-entry relative" ref={account}>
      <button
        className="profile-button authenticated flex min-h-11 w-full items-center justify-start gap-3 rounded-control border border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted no-underline transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink max-[899px]:size-11 max-[899px]:min-h-11 max-[899px]:w-auto max-[899px]:min-w-11 max-[899px]:justify-center max-[899px]:p-2 pointer-coarse:min-w-11"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        aria-controls="account-menu"
        onClick={() => {
          setAccountOpen((current) => !current);
          setLogoutError(null);
        }}
      >
        <UserCircleCheck className="size-5 shrink-0" weight="fill" />
        <span className="min-w-0 truncate max-[899px]:hidden">
          {profile.characterName || profile.displayAccount}
        </span>
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
      className="account-menu absolute bottom-0 left-[calc(100%+12px)] z-30 w-80 max-w-[calc(100vw-32px)] rounded-panel border border-control bg-surface p-5 max-[899px]:top-[calc(100%+8px)] max-[899px]:right-0 max-[899px]:bottom-auto max-[899px]:left-auto"
      id="account-menu"
      role="dialog"
      aria-label="当前账号信息"
    >
      <div className="account-menu-identity flex items-center gap-3">
        <UserCircleCheck className="size-8 text-accent" weight="duotone" />
        <div className="grid gap-1">
          <span className="text-xs text-muted">当前登录角色</span>
          <strong>{profile.characterName || profile.displayAccount}</strong>
        </div>
      </div>
      <dl className="account-menu-details my-5 grid gap-4">
        <div>
          <dt className="text-xs text-muted">盛趣账号</dt>
          <dd className="mt-1 break-words">{profile.displayAccount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">大区 / 服务器</dt>
          <dd className="mt-1 break-words">{location || "未提供"}</dd>
        </div>
      </dl>
      <button
        className="account-logout flex min-h-10 w-full items-center justify-center gap-2 rounded-control border border-danger text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover"
        type="button"
        disabled={loggingOut}
        onClick={() => void onLogout()}
      >
        {loggingOut ? (
          <>
            <SpinnerGap className="spin animate-[login-spin_900ms_linear_infinite]" />
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
        <div
          className="account-menu-error mt-3 flex gap-2 text-sm text-danger"
          role="alert"
        >
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
