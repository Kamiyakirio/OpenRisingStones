/** Regional Teleport diagnostic workspace bound to the game bridge ViewModel. */
import { AppHeader } from "../app/components/AppHeader";
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { SiteFooter } from "../app/components/SiteFooter";
import { TeleportWorkspace } from "../features/teleport/components/TeleportWorkspace";
import type { LoginProfile } from "../features/auth/types";
import { useTeleportWorkspace } from "../features/teleport/hooks/useTeleportWorkspace";

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

export function TeleportPage({
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
  const viewModel = useTeleportWorkspace({
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
      <TeleportWorkspace viewModel={viewModel} onOpenLogin={onOpenLogin} />
      <SiteFooter feature="teleport" />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={onLoginSuccess} />
      )}
    </>
  );
}
