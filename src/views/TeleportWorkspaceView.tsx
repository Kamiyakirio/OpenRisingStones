/** Regional Teleport diagnostic workspace bound to the game bridge ViewModel. */
import { AppHeader } from "../components/AppHeader";
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { SiteFooter } from "../components/SiteFooter";
import { TeleportPage } from "../features/teleport/components/TeleportWorkspace";
import type { LoginProfile } from "../features/auth/types";
import { useTeleportWorkspaceViewModel } from "../features/teleport/hooks/useTeleportWorkspace";

type TeleportWorkspaceViewProps = {
  dark: boolean;
  loginOpen: boolean;
  loginChecking: boolean;
  profile: LoginProfile | null;
  onCloseLogin: () => void;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLoginSuccess: (profile: LoginProfile) => void;
  onLogout: () => Promise<void>;
};

export function TeleportWorkspaceView({
  dark,
  loginOpen,
  loginChecking,
  profile,
  onCloseLogin,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLoginSuccess,
  onLogout,
}: TeleportWorkspaceViewProps) {
  const viewModel = useTeleportWorkspaceViewModel({
    authenticated: Boolean(profile),
    loginChecking,
  });

  return (
    <>
      <AppHeader
        dark={dark}
        feature="teleport"
        profile={profile}
        onGoHome={onGoHome}
        onToggleTheme={onToggleTheme}
        onOpenLogin={onOpenLogin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      <TeleportPage viewModel={viewModel} onOpenLogin={onOpenLogin} />
      <SiteFooter feature="teleport" />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={onLoginSuccess} />
      )}
    </>
  );
}
