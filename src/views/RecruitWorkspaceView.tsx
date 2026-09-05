/** Public recruitment workspace with optional account controls and no login wall. */
import { AppHeader } from "../components/AppHeader";
import { AdvancedRecruitPage } from "../components/AdvancedRecruitPage";
import { AdvancedRecruitRiskDialog } from "../components/AdvancedRecruitRiskDialog";
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { RecruitPage } from "../components/RecruitPage";
import { SiteFooter } from "../components/SiteFooter";
import type { LoginProfile } from "../features/auth/types";
import { useRecruitWorkspaceViewModel } from "../viewmodels/useRecruitWorkspaceViewModel";

type RecruitWorkspaceViewProps = {
  dark: boolean;
  loginOpen: boolean;
  profile: LoginProfile | null;
  onCloseLogin: () => void;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLoginSuccess: (profile: LoginProfile) => void;
  onLogout: () => Promise<void>;
};

export function RecruitWorkspaceView({
  dark,
  loginOpen,
  profile,
  onCloseLogin,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLoginSuccess,
  onLogout,
}: RecruitWorkspaceViewProps) {
  const viewModel = useRecruitWorkspaceViewModel();

  return (
    <>
      <AppHeader
        dark={dark}
        feature="recruit"
        recruitSection={viewModel.section}
        profile={profile}
        onGoHome={onGoHome}
        onToggleTheme={onToggleTheme}
        onOpenLogin={onOpenLogin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        onOpenRecruitFeed={viewModel.openFeed}
        onOpenAdvancedRecruit={viewModel.openAdvanced}
      />
      {viewModel.section === "feed" ? (
        <RecruitPage viewModel={viewModel.feed} />
      ) : (
        <AdvancedRecruitPage viewModel={viewModel.advanced} />
      )}
      <SiteFooter feature="recruit" />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={onLoginSuccess} />
      )}
      {viewModel.riskOpen && (
        <AdvancedRecruitRiskDialog
          storageError={viewModel.riskStorageError}
          onAgree={viewModel.agreeToAdvancedRisk}
          onCancel={viewModel.cancelAdvancedRisk}
        />
      )}
    </>
  );
}
