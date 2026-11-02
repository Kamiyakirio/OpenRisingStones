import { AdvancedRecruitBrowser } from "../features/recruit/components/AdvancedRecruitBrowser";
import { AdvancedRecruitRiskDialog } from "../features/recruit/components/AdvancedRecruitRiskDialog";
import { LoginDialog } from "../features/auth/components/LoginDialog";
import { RecruitBrowser } from "../features/recruit/components/RecruitBrowser";
import { SiteFooter } from "../app/components/SiteFooter";
import type { LoginProfile } from "../features/auth/types";
import { useRecruitWorkspace } from "../features/recruit/hooks/useRecruitWorkspace";

/** Reused presentation strings stay static and are allocated once for this module. */
const recruitTabClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] min-h-10 shrink-0 rounded-control border border-transparent px-4 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-ink aria-pressed:border-control aria-pressed:bg-selected aria-pressed:text-accent";

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
        className="workspace-tabs mx-auto flex w-full gap-1 overflow-x-auto border-b border-line bg-surface px-8 py-2 max-[899px]:px-4"
        aria-label="招募视图"
      >
        <button
          className={recruitTabClasses}
          type="button"
          aria-pressed={viewModel.section === "feed"}
          onClick={viewModel.openFeed}
        >
          招募列表
        </button>
        <button
          className={recruitTabClasses}
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
