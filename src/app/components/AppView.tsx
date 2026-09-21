/** Root View with declarative bindings and no infrastructure access. */
import { AppHeader } from "./AppHeader";
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
      className={`app feature-${viewModel.activeFeature}${viewModel.dark ? " theme-dark" : ""}`}
    >
      <a className="skip-link" href="#workspace-content">
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
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>
        {viewModel.activeFeature === "home" ? (
          <HomePage
            onOpenGlamour={viewModel.openGlamour}
            onOpenRecruit={viewModel.openRecruit}
            onOpenTeleport={viewModel.openTeleport}
            onOpenGearing={viewModel.openGearing}
            onOpenFishing={viewModel.openFishing}
            onOpenChat={viewModel.openChat}
            onOpenPortrait={viewModel.openPortrait}
          />
        ) : viewModel.activeFeature === "fishing" ? (
          <Suspense fallback={<p role="status">正在加载钓鱼数据库…</p>}>
            <FishingPage />
          </Suspense>
        ) : viewModel.activeFeature === "gearing" ? (
          <GearingErrorBoundary onGoHome={viewModel.goHome}>
            <Suspense fallback={<p role="status">正在加载配装…</p>}>
              <GearingPage />
            </Suspense>
          </GearingErrorBoundary>
        ) : viewModel.activeFeature === "gearing-benchmark" &&
          GearingBenchmarkPage ? (
          <GearingErrorBoundary onGoHome={viewModel.goHome}>
            <Suspense fallback={<p role="status">正在加载性能测试…</p>}>
              <GearingBenchmarkPage onBack={viewModel.openGearing} />
            </Suspense>
          </GearingErrorBoundary>
        ) : viewModel.activeFeature === "debug" && DebugPage ? (
          <Suspense fallback={<p role="status">正在加载调试工具…</p>}>
            <DebugPage />
          </Suspense>
        ) : viewModel.activeFeature === "chat" ? (
          <ChatPage />
        ) : viewModel.activeFeature === "portrait" ? (
          <Suspense fallback={<p role="status">正在加载肖像助手…</p>}>
            <PortraitPage />
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
        viewModel.activeFeature === "portrait") &&
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
