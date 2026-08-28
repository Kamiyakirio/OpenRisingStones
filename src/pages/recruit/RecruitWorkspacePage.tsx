/** Page-level composition for the public recruitment workspace. */
import { AppHeader } from "@/shared/components/AppHeader";
import { AdvancedRecruitPage } from "@/features/recruit/components/AdvancedRecruitPage";
import { AdvancedRecruitRiskDialog } from "@/features/recruit/components/AdvancedRecruitRiskDialog";
import { LoginDialog } from "@/features/auth/components/LoginDialog";
import { RecruitPage } from "@/features/recruit/components/RecruitPage";
import { SiteFooter } from "@/shared/components/SiteFooter";
import type { LoginProfile } from "@/features/auth/model/auth";
import { useRecruitWorkspaceViewModel } from "@/features/recruit/hooks/useRecruitWorkspaceViewModel";

type RecruitWorkspacePageProps = {
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

export function RecruitWorkspacePage({
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
}: RecruitWorkspacePageProps) {
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
