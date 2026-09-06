/** Root View with declarative bindings and no infrastructure access. */
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
      {viewModel.activeFeature === "home" ? (
        <HomePage
          dark={viewModel.dark}
          onOpenGlamour={viewModel.openGlamour}
          onOpenRecruit={viewModel.openRecruit}
          onOpenTeleport={viewModel.openTeleport}
          onOpenGearing={viewModel.openGearing}
          onOpenSettings={viewModel.openSettings}
          onToggleTheme={viewModel.toggleTheme}
        />
      ) : viewModel.activeFeature === "gearing" ? (
        <GearingErrorBoundary onGoHome={viewModel.goHome}>
          <Suspense fallback={<p role="status">正在加载配装…</p>}>
            <GearingPage
              dark={viewModel.dark}
              onGoHome={viewModel.goHome}
              onToggleTheme={viewModel.toggleTheme}
              onOpenSettings={viewModel.openSettings}
            />
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
      {viewModel.settingsOpen && (
        <SettingsDialog onClose={viewModel.closeSettings} />
      )}
    </div>
  );
}
