/** Root View with declarative bindings and no infrastructure access. */
import { HomePage } from "@/pages/home/HomePage";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import type { AppViewModel } from "@/app/hooks/useAppViewModel";
import { GlamourWorkspacePage } from "@/pages/glamour/GlamourWorkspacePage";
import { RecruitWorkspacePage } from "@/pages/recruit/RecruitWorkspacePage";

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
          onOpenSettings={viewModel.openSettings}
          onToggleTheme={viewModel.toggleTheme}
        />
      ) : viewModel.activeFeature === "glamour" ? (
        <GlamourWorkspacePage
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
      ) : (
        <RecruitWorkspacePage
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
