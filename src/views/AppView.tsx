/** Root View with declarative bindings and no infrastructure access. */
import { HomePage } from "../components/HomePage";
import { SettingsDialog } from "../components/SettingsDialog";
import type { AppViewModel } from "../viewmodels/useAppViewModel";
import { GlamourWorkspaceView } from "./GlamourWorkspaceView";
import { RecruitWorkspaceView } from "./RecruitWorkspaceView";
import { TeleportWorkspaceView } from "./TeleportWorkspaceView";

type AppViewProps = {
  viewModel: AppViewModel;
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
          onOpenSettings={viewModel.openSettings}
          onToggleTheme={viewModel.toggleTheme}
        />
      ) : viewModel.activeFeature === "glamour" ? (
        <GlamourWorkspaceView
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
        <RecruitWorkspaceView
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
        <TeleportWorkspaceView
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
      )}
      {viewModel.settingsOpen && (
        <SettingsDialog onClose={viewModel.closeSettings} />
      )}
    </div>
  );
}
