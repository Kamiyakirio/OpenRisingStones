/** Public recruitment workspace with optional account controls and no login wall. */
import { AppHeader } from "../app/components/AppHeader";
import { AdvancedRecruitBrowser } from "../features/recruit/components/AdvancedRecruitBrowser";
import { AdvancedRecruitRiskDialog } from "../features/recruit/components/AdvancedRecruitRiskDialog";
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { RecruitBrowser } from "../features/recruit/components/RecruitBrowser";
import { SiteFooter } from "../app/components/SiteFooter";
import type { LoginProfile } from "../features/auth/types";
import { useRecruitWorkspace } from "../features/recruit/hooks/useRecruitWorkspace";

type RecruitPageProps = {
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

export function RecruitPage({
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
}: RecruitPageProps) {
  const viewModel = useRecruitWorkspace();

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
        <RecruitBrowser viewModel={viewModel.feed} />
      ) : (
        <AdvancedRecruitBrowser viewModel={viewModel.advanced} />
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
