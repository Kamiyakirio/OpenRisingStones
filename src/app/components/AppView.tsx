/** Root View with declarative bindings and no infrastructure access. */
import { workspaceColorClasses } from "../../shared/styles/workspaceColors";
import { AppHeader } from "./AppHeader";
import { LoadingPage } from "./LoadingPage";
import { LoginDialog } from "../../features/auth/components/LoginDialog";
import { SettingsDialog } from "../../features/settings/components/SettingsDialog";
import { GlamourPage } from "../../pages/GlamourPage";
import { HomePage } from "../../pages/HomePage";
import { RecruitPage } from "../../pages/RecruitPage";
import { TeleportPage } from "../../pages/TeleportPage";
import { ChatPage } from "../../pages/ChatPage";
import type { AppController } from "../hooks/useAppController";
import { lazy, Suspense } from "react";
import { GearingErrorBoundary } from "../../features/gearing/components/GearingErrorBoundary";
import { SquaresFour } from "@phosphor-icons/react";
import { workspaceNames } from "../navigation";
const FishingPage = lazy(() =>
  import("../../pages/FishingPage").then((module) => ({
    default: module.FishingPage,
  })),
);
const PortraitPage = lazy(() =>
  import("../../pages/PortraitPage").then((module) => ({
    default: module.PortraitPage,
  })),
);
const MentorPage = lazy(() =>
  import("../../pages/MentorPage").then((module) => ({
    default: module.MentorPage,
  })),
);
const GearingPage = lazy(() =>
  import("../../pages/GearingPage").then((module) => ({
    default: module.GearingPage,
  })),
);
const GearingBenchmarkPage = __DEBUG_BUILD__
  ? lazy(() =>
      import("../../pages/GearingBenchmarkPage").then((module) => ({
        default: module.GearingBenchmarkPage,
      })),
    )
  : null;
const DebugPage = __DEBUG_BUILD__
  ? lazy(() =>
      import("../../pages/DebugPage").then((module) => ({
        default: module.DebugPage,
      })),
    )
  : null;

type AppViewProps = {
  viewModel: AppController;
};

export function AppView({ viewModel }: AppViewProps) {
  return (
    <div
      className={`${workspaceColorClasses} [--ors-color-canvas:#fcfcfa] [--ors-color-surface:#ffffff] [--ors-color-hover:#eeeff3] [--ors-color-selected:#eef0f5] [--ors-color-text:#202127] [--ors-color-muted:#596170] [--ors-color-line:#c7cbd3] [--ors-color-control-line:#808896] [--ors-color-accent:#53618a] [--ors-color-accent-hover:#435074] [--ors-color-on-accent:#ffffff] [--ors-color-disabled:#687183] [--ors-color-success:#187552] [--ors-color-warning:#9b580c] [--ors-color-danger:#bf3548] [--ors-color-info:#4a6d91] [--ors-color-violet:#716184] [--ors-color-pink:#865e76] [--ors-color-teal:#466f73] [--ors-color-orange:#86684c] [--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.12)] [--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.2)] [color-scheme:light] [&.theme-dark]:[--ors-color-canvas:#0e0e10] [&.theme-dark]:[--ors-color-surface:#18191d] [&.theme-dark]:[--ors-color-hover:#26282f] [&.theme-dark]:[--ors-color-selected:#2a2d36] [&.theme-dark]:[--ors-color-text:#f2f3f5] [&.theme-dark]:[--ors-color-muted:#b0b6c3] [&.theme-dark]:[--ors-color-line:#383b43] [&.theme-dark]:[--ors-color-control-line:#778094] [&.theme-dark]:[--ors-color-accent:#a0aacb] [&.theme-dark]:[--ors-color-accent-hover:#b6bfd8] [&.theme-dark]:[--ors-color-on-accent:#101128] [&.theme-dark]:[--ors-color-disabled:#9aa2b2] [&.theme-dark]:[--ors-color-success:#70d4a4] [&.theme-dark]:[--ors-color-warning:#efba72] [&.theme-dark]:[--ors-color-danger:#ff94a5] [&.theme-dark]:[--ors-color-info:#9bafc8] [&.theme-dark]:[--ors-color-violet:#b2a3c5] [&.theme-dark]:[--ors-color-pink:#c2a0b2] [&.theme-dark]:[--ors-color-teal:#91b6b8] [&.theme-dark]:[--ors-color-orange:#c7ad90] [&.theme-dark]:[--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.4)] [&.theme-dark]:[--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.55)] [&.theme-dark]:[color-scheme:dark] [.loading-page--fullscreen&&&&]:grid-cols-[minmax(0,_1fr)] [&&&&]:[--ink:var(--ors-color-text)] [&&&&]:[--muted:var(--ors-color-muted)] [&&&&]:[--paper:var(--ors-color-canvas)] [&&&&]:[--surface:var(--ors-color-surface)] [&&&&]:[--surface-2:var(--ors-color-hover)] [&&&&]:[--line:var(--ors-color-line)] [&&&&]:[--accent:var(--ors-color-accent)] [&&&&]:[--accent-strong:var(--ors-color-accent)] [&&&&]:[--accent-soft:var(--ors-color-selected)] [&&&&]:[--home-accent:var(--ors-color-accent)] [&&&&]:[--home-accent-strong:var(--ors-color-accent)] [&&&&]:[--danger:var(--ors-color-danger)] [&&&&]:[--danger-strong:var(--ors-color-danger)] [&&&&]:[--danger-soft:color-mix(in_srgb,var(--ors-color-danger)_10%,var(--ors-color-surface))] [&&&&]:[--danger-line:var(--ors-color-danger)] [&&&&]:[--shadow:var(--ors-shadow-popover)] [&&&&_button]:[transition:background-color_120ms,_color_120ms,_border-color_120ms] [&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[36px] [@media(pointer:_coarse)]:[&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[44px] [@media(pointer:_coarse)]:[&&&&_:is(.icon-button,.profile-button,.dialog-close,.risk-dialog-close)]:min-w-11 [.loading-page--fullscreen&]:w-full [.loading-page--fullscreen&]:bg-canvas grid min-h-dvh grid-cols-[232px_minmax(0,1fr)] bg-canvas font-sans text-[15px] leading-relaxed text-ink [&_button:disabled]:cursor-not-allowed [&_input[type=checkbox]]:size-4 [&_input[type=radio]]:size-4 max-[899px]:block app feature-${viewModel.activeFeature}${viewModel.dark ? " theme-dark" : ""}`}
    >
      <a
        className="skip-link fixed top-2 left-2 z-50 -translate-y-[200%] rounded-lg bg-accent px-4 py-2 text-on-accent focus:translate-y-0"
        href="#workspace-content"
      >
        跳到内容
      </a>
      <AppHeader
        dark={viewModel.dark}
        feature={viewModel.activeFeature}
        profile={viewModel.loginProfile}
        onNavigate={viewModel.navigate}
        onToggleTheme={viewModel.toggleTheme}
        onOpenSettings={viewModel.openSettings}
        onOpenLogin={viewModel.openLogin}
        onLogout={viewModel.logout}
      />
      <div
        id="workspace-content"
        className="workspace-content min-w-0"
        tabIndex={-1}
      >
        <header className="workspace-bar sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-5 [&_>_a]:rounded-lg [&_>_a]:border [&_>_a]:border-control [&_>_a]:px-3 [&_>_a]:py-1.5 [&_>_a]:text-xs [&_>_a]:text-muted [&_>_a]:hover:bg-hover [&_>_a]:hover:text-ink max-[899px]:static max-[899px]:h-12 max-[899px]:px-4">
          <div
            className={
              "workspace-location flex min-w-0 items-center gap-2 font-semibold text-ink [&_svg]:size-5 [&_svg]:shrink-0 [&&&&_svg]:[color:var(--tool-color,_var(--ors-color-accent))]"
            }
          >
            <SquaresFour aria-hidden="true" />
            <span>{workspaceNames[viewModel.activeFeature]}</span>
          </div>
          {viewModel.activeFeature !== "home" && (
            <a
              className="app-brand flex items-center gap-2 text-sm font-bold tracking-tight text-ink no-underline whitespace-nowrap [&_>_svg]:size-6 [&_>_svg]:shrink-0 [&_>_svg]:text-accent max-[519px]:text-xs"
              href="#home"
              onClick={(event) => {
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  viewModel.goHome();
                }
              }}
            >
              所有工具
            </a>
          )}
        </header>
        {viewModel.activeFeature === "home" ? (
          <HomePage
            profile={viewModel.loginProfile}
            loginChecking={viewModel.loginChecking}
            onOpenLogin={viewModel.openLogin}
            signInStatus={viewModel.signInStatus}
            onRetrySignIn={viewModel.retrySignIn}
            onOpenGlamour={viewModel.openGlamour}
            onOpenRecruit={viewModel.openRecruit}
            onOpenTeleport={viewModel.openTeleport}
            onOpenGearing={viewModel.openGearing}
            onOpenFishing={viewModel.openFishing}
            onOpenChat={viewModel.openChat}
            onOpenPortrait={viewModel.openPortrait}
            onOpenMentor={viewModel.openMentor}
          />
        ) : viewModel.activeFeature === "fishing" ? (
          <Suspense fallback={<LoadingPage message="正在加载钓鱼数据库…" />}>
            <FishingPage />
          </Suspense>
        ) : viewModel.activeFeature === "gearing" ? (
          <GearingErrorBoundary onGoHome={viewModel.goHome}>
            <Suspense fallback={<LoadingPage message="正在加载配装…" />}>
              <GearingPage />
            </Suspense>
          </GearingErrorBoundary>
        ) : viewModel.activeFeature === "gearing-benchmark" &&
          GearingBenchmarkPage ? (
          <GearingErrorBoundary onGoHome={viewModel.goHome}>
            <Suspense fallback={<LoadingPage message="正在加载性能测试…" />}>
              <GearingBenchmarkPage onBack={viewModel.openGearing} />
            </Suspense>
          </GearingErrorBoundary>
        ) : viewModel.activeFeature === "debug" && DebugPage ? (
          <Suspense fallback={<LoadingPage message="正在加载调试工具…" />}>
            <DebugPage />
          </Suspense>
        ) : viewModel.activeFeature === "chat" ? (
          <ChatPage />
        ) : viewModel.activeFeature === "portrait" ? (
          <Suspense fallback={<LoadingPage message="正在加载肖像助手…" />}>
            <PortraitPage />
          </Suspense>
        ) : viewModel.activeFeature === "mentor" ? (
          <Suspense fallback={<LoadingPage message="正在加载导随记录…" />}>
            <MentorPage />
          </Suspense>
        ) : viewModel.activeFeature === "glamour" ? (
          <GlamourPage
            dark={viewModel.dark}
            loginOpen={viewModel.loginOpen}
            loginChecking={viewModel.loginChecking}
            loginExpired={viewModel.loginExpired}
            profile={viewModel.loginProfile}
            onCloseLogin={viewModel.closeLogin}
            onGoHome={viewModel.goHome}
            onToggleTheme={viewModel.toggleTheme}
            onOpenLogin={viewModel.openLogin}
            onOpenSettings={viewModel.openSettings}
            onLoginSuccess={viewModel.loginSucceeded}
            onLogout={viewModel.logout}
          />
        ) : viewModel.activeFeature === "recruit" ? (
          <RecruitPage
            dark={viewModel.dark}
            loginOpen={viewModel.loginOpen}
            profile={viewModel.loginProfile}
            onCloseLogin={viewModel.closeLogin}
            onGoHome={viewModel.goHome}
            onToggleTheme={viewModel.toggleTheme}
            onOpenLogin={viewModel.openLogin}
            onOpenSettings={viewModel.openSettings}
            onLoginSuccess={viewModel.loginSucceeded}
            onLogout={viewModel.logout}
          />
        ) : (
          <TeleportPage
            dark={viewModel.dark}
            loginOpen={viewModel.loginOpen}
            loginChecking={viewModel.loginChecking}
            profile={viewModel.loginProfile}
            onCloseLogin={viewModel.closeLogin}
            onGoHome={viewModel.goHome}
            onToggleTheme={viewModel.toggleTheme}
            onOpenLogin={viewModel.openLogin}
            onOpenSettings={viewModel.openSettings}
            onLoginSuccess={viewModel.loginSucceeded}
            onLogout={viewModel.logout}
          />
        )}
      </div>
      {(viewModel.activeFeature === "home" ||
        viewModel.activeFeature === "gearing" ||
        viewModel.activeFeature === "fishing" ||
        viewModel.activeFeature === "chat" ||
        viewModel.activeFeature === "portrait" ||
        viewModel.activeFeature === "mentor") &&
        viewModel.loginOpen && (
          <LoginDialog
            onClose={viewModel.closeLogin}
            onSuccess={viewModel.loginSucceeded}
          />
        )}
      {viewModel.settingsOpen && (
        <SettingsDialog
          onClose={viewModel.closeSettings}
          onOpenGearingBenchmark={viewModel.openGearingBenchmark}
        />
      )}
    </div>
  );
}
