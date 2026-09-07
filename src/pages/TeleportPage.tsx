/** Regional Teleport diagnostic workspace bound to the game bridge state hook. */
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { SiteFooter } from "../app/components/SiteFooter";
import { TeleportWorkspace } from "../features/teleport/components/TeleportWorkspace";
import type { LoginProfile } from "../features/auth/types";
import { useTeleportWorkspace } from "../features/teleport/hooks/useTeleportWorkspace";

type TeleportPageProps = {
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
  loginOpen,
  loginChecking,
  profile,
  onCloseLogin,
  onOpenLogin,
  onGoHome,
  onLoginSuccess,
}: TeleportPageProps) {
  const viewModel = useTeleportWorkspace({
    authenticated: Boolean(profile),
    loginChecking,
  });

  return (
    <>
      <TeleportWorkspace
        viewModel={viewModel}
        onOpenLogin={onOpenLogin}
        onGoHome={onGoHome}
      />
      <SiteFooter feature="teleport" />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={onLoginSuccess} />
      )}
    </>
  );
}
