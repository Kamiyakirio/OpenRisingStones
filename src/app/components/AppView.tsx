/** Root View with declarative bindings and no infrastructure access. */
import { AppHeader } from "./AppHeader";
import { LoginDialog } from "../../features/auth/components/LoginDialog";
import { SettingsDialog } from "../../features/settings/components/SettingsDialog";
import { GlamourPage } from "../../pages/GlamourPage";
import { HomePage } from "../../pages/HomePage";
import { RecruitPage } from "../../pages/RecruitPage";
import { TeleportPage } from "../../pages/TeleportPage";
import type { AppController } from "../hooks/useAppController";
import { lazy, Suspense } from "react";
import { GearingErrorBoundary } from "../../features/gearing/components/GearingErrorBoundary";
const GearingPage = lazy(() =>
  import("../../pages/GearingPage").then((module) => ({
    default: module.GearingPage,
  })),
);

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
          />
        ) : viewModel.activeFeature === "gearing" ? (
          <GearingErrorBoundary onGoHome={viewModel.goHome}>
            <Suspense fallback={<p role="status">正在加载配装…</p>}>
              <GearingPage />
            </Suspense>
          </GearingErrorBoundary>
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
        viewModel.activeFeature === "gearing") &&
        viewModel.loginOpen && (
          <LoginDialog
            onClose={viewModel.closeLogin}
            onSuccess={viewModel.loginSucceeded}
          />
        )}
      {viewModel.settingsOpen && (
        <SettingsDialog onClose={viewModel.closeSettings} />
      )}
    </div>
  );
}
