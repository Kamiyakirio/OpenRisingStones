/** Public recruitment workspace with optional account controls and no login wall. */
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
  loginOpen,
  onCloseLogin,
  onLoginSuccess,
}: RecruitPageProps) {
  const viewModel = useRecruitWorkspace();

  return (
    <>
      <nav
        className="workspace-tabs mx-auto flex w-full gap-1 overflow-x-auto border-b border-line bg-surface px-8 py-2 [&_button]:min-h-10 [&_button]:shrink-0 [&_button]:rounded-lg [&_button]:border [&_button]:border-transparent [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-medium [&_button]:text-muted [&_button]:hover:bg-hover [&_button]:hover:text-ink [&_button[aria-pressed=true]]:border-control [&_button[aria-pressed=true]]:bg-selected [&_button[aria-pressed=true]]:text-accent max-[899px]:px-4"
        aria-label="招募视图"
      >
        <button
          type="button"
          aria-pressed={viewModel.section === "feed"}
          onClick={viewModel.openFeed}
        >
          招募列表
        </button>
        <button
          type="button"
          aria-pressed={viewModel.section === "advanced"}
          onClick={viewModel.openAdvanced}
        >
          高级筛选
        </button>
      </nav>
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
