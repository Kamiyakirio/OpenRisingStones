/** Root View with declarative bindings and no infrastructure access. */
import clsx from "clsx";
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
      data-feature={viewModel.activeFeature}
      className={clsx(
        "app grid min-h-dvh grid-cols-[232px_minmax(0,1fr)] bg-canvas font-sans text-[15px] leading-relaxed text-ink max-[899px]:block",
        workspaceColorClasses,
        viewModel.dark ? "theme-dark" : "theme-light",
      )}
    >
      <a
        className="skip-link fixed top-2 left-2 z-50 -translate-y-[200%] rounded-control bg-accent px-4 py-2 text-on-accent focus:translate-y-0"
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
        <header className="workspace-bar sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-5 max-[899px]:static max-[899px]:h-12 max-[899px]:px-4">
          <div className="workspace-location flex min-w-0 items-center gap-2 font-semibold text-ink">
            <SquaresFour
              className="size-5 shrink-0 text-[var(--tool-color,_var(--ors-color-accent))]"
              aria-hidden="true"
            />
            <span>{workspaceNames[viewModel.activeFeature]}</span>
          </div>
          {viewModel.activeFeature !== "home" && (
            <a
              className="app-brand flex items-center gap-2 rounded-control border border-control px-3 py-1.5 text-xs font-bold tracking-tight whitespace-nowrap text-muted no-underline hover:bg-hover hover:text-ink max-[519px]:text-xs"
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
