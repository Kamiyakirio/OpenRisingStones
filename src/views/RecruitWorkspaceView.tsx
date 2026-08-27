/** Public recruitment workspace with optional account controls and no login wall. */
import { AppHeader } from "../components/AppHeader";
import { LoginDialog } from "../components/LoginDialog";
import { RecruitPage } from "../components/RecruitPage";
import { SiteFooter } from "../components/SiteFooter";
import type { LoginProfile } from "../models/auth";
import { useRecruitViewModel } from "../viewmodels/useRecruitViewModel";

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
  const viewModel = useRecruitViewModel();

  return (
    <>
      <AppHeader
        dark={dark}
        feature="recruit"
        profile={profile}
        onGoHome={onGoHome}
        onToggleTheme={onToggleTheme}
        onOpenLogin={onOpenLogin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      <RecruitPage viewModel={viewModel} />
      <SiteFooter feature="recruit" />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={onLoginSuccess} />
      )}
    </>
  );
}
