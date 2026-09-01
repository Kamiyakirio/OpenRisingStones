/** Glamour workspace View bound to its feature-level ViewModel. */
import { AppHeader } from "../components/AppHeader";
import { DiscoveryFilters } from "../components/DiscoveryFilters";
import { EquipmentSearchPage } from "../components/EquipmentSearchPage";
import { GlamourDetailView } from "../components/GlamourDetailView";
import { GlamourGallery } from "../components/GlamourGallery";
import { GlamourLoginWall } from "../components/GlamourLoginWall";
import { GlamourOwnedItemsPanel } from "../components/GlamourOwnedItemsPanel";
import { LoginDialog } from "../components/LoginDialog";
import { RiskDialog } from "../components/RiskDialog";
import { SiteFooter } from "../components/SiteFooter";
import { WikiVerificationStatus } from "../components/WikiVerificationStatus";
import type { LoginProfile } from "../models/auth";
import { useGlamourWorkspaceViewModel } from "../viewmodels/useGlamourWorkspaceViewModel";

type GlamourWorkspaceViewProps = {
  dark: boolean;
  loginOpen: boolean;
  loginChecking: boolean;
  loginExpired: boolean;
  profile: LoginProfile | null;
  onCloseLogin: () => void;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLoginSuccess: (profile: LoginProfile) => void;
  onLogout: () => Promise<void>;
};

export function GlamourWorkspaceView({
  dark,
  loginOpen,
  loginChecking,
  loginExpired,
  profile,
  onCloseLogin,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLoginSuccess,
  onLogout,
}: GlamourWorkspaceViewProps) {
  const viewModel = useGlamourWorkspaceViewModel({
    authenticated: Boolean(profile),
    loginChecking,
    onLoginSuccess,
  });
  const { discovery, wiki } = viewModel;

  return (
    <>
      <AppHeader
        dark={dark}
        feature="glamour"
        profile={profile}
        onGoHome={onGoHome}
        onToggleTheme={onToggleTheme}
        onOpenLogin={onOpenLogin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      {loginChecking || !profile ? (
        <GlamourLoginWall
          checking={loginChecking}
          expired={loginExpired}
          onLogin={onOpenLogin}
          onGoHome={onGoHome}
        />
      ) : viewModel.selectedGlamour ? (
        <GlamourDetailView
          glamour={viewModel.selectedGlamour}
          saved={discovery.saved.includes(viewModel.selectedGlamour.id)}
          wiki={wiki}
          ownedItems={viewModel.ownedItems}
          onBack={viewModel.closeDetail}
          onSearchEquipment={viewModel.searchDetailEquipment}
          onToggleSave={discovery.toggleSave}
        />
      ) : discovery.equipmentResultsOpen ? (
        <EquipmentSearchPage
          query={discovery.query}
          filters={discovery.activeEquipmentFilters}
          items={discovery.equipmentCandidates}
          page={discovery.equipmentPage}
          pageSize={discovery.equipmentPageSize}
          loading={discovery.equipmentSearchLoading}
          error={discovery.equipmentSearchError}
          canShowPrevious={discovery.canShowPreviousEquipmentPage}
          canShowNext={discovery.canShowNextEquipmentPage}
          onBack={discovery.closeEquipmentResults}
          onSelect={viewModel.selectEquipment}
          onShowPrevious={discovery.showPreviousEquipmentPage}
          onShowNext={discovery.showNextEquipmentPage}
          onRetry={discovery.retryEquipmentSearch}
          onPageSizeChange={discovery.changeEquipmentPageSize}
        />
      ) : (
        <main id="top">
          <DiscoveryFilters
            searchMode={discovery.searchMode}
            query={discovery.query}
            activeQuery={discovery.activeQuery}
            raceId={discovery.raceId}
            genderId={discovery.genderId}
            selectedJobs={discovery.selectedJobs}
            searchLoading={
              discovery.searchMode === "title"
                ? discovery.loading
                : discovery.equipmentSearchLoading
            }
            canSubmitSearch={discovery.canSubmitSearch}
            equipmentFilters={discovery.equipmentFilters}
            selectedEquipment={discovery.selectedEquipment}
            equivalentEquipment={discovery.equipmentModelCandidates}
            selectedEquivalentEquipmentIds={discovery.selectedEquipmentModelIds}
            equivalentStatus={
              wiki.itemName === discovery.selectedEquipment?.name
                ? wiki.status
                : "idle"
            }
            equivalentError={
              wiki.itemName === discovery.selectedEquipment?.name
                ? wiki.error
                : null
            }
            equivalentUpdating={discovery.equipmentRangeUpdating}
            onSearchModeChange={discovery.setSearchMode}
            onQueryChange={discovery.setQuery}
            onSearch={discovery.submitSearch}
            onClearSearch={discovery.clearSearch}
            onEquipmentFiltersChange={discovery.setEquipmentFilters}
            onClearEquipmentFilters={discovery.clearEquipmentFilters}
            onRaceChange={discovery.setRaceId}
            onGenderChange={discovery.setGenderId}
            onToggleJob={discovery.toggleJob}
            onClearJobs={discovery.clearJobs}
            onToggleEquivalent={discovery.toggleEquivalentEquipment}
            onSelectAllEquivalent={discovery.selectAllEquivalentEquipment}
            onClearEquivalent={discovery.clearEquivalentEquipment}
          />
          <GlamourOwnedItemsPanel viewModel={viewModel.ownedItems} />
          <GlamourGallery
            results={discovery.results}
            saved={discovery.saved}
            order={discovery.order}
            total={discovery.total}
            loading={discovery.loading}
            loadingMore={discovery.loadingMore}
            canLoadMore={discovery.canLoadMore}
            error={discovery.error}
            onOrderChange={discovery.setOrder}
            onToggleSave={discovery.toggleSave}
            onOpenDetail={viewModel.openDetail}
            onClearSearch={discovery.clearSearch}
            onRetry={discovery.retry}
            onLoadMore={discovery.loadMore}
            ownedItems={viewModel.ownedItems}
          />
        </main>
      )}
      <SiteFooter />
      {loginOpen && (
        <LoginDialog
          onClose={onCloseLogin}
          onSuccess={viewModel.loginSucceeded}
        />
      )}
      {profile && (
        <WikiVerificationStatus
          status={wiki.status}
          itemName={wiki.itemName}
          error={wiki.error}
          onShow={() => void wiki.showVerification()}
          onCancel={() => void wiki.cancelVerification()}
          onDismiss={wiki.dismissError}
        />
      )}
      {viewModel.ownedItems.riskOpen && (
        <RiskDialog
          title="读取游戏物品前请确认风险"
          items={[
            "本功能需要向当前 FF14 游戏进程注入只读组件。",
            "在多数语境下，进程注入可能被视为使用外部辅助程序。",
            "本次操作只读取当前角色的物品 ID，不会修改游戏数据或执行物品操作。",
          ]}
          description={
            <p>
              读取结果会使用当前游戏登录会话派生的密钥加密后保存在本机，只有登录有效时才能解密；“清除本地数据”会删除密文。
            </p>
          }
          confirmLabel="确认并读取物品"
          onConfirm={() => void viewModel.ownedItems.confirmSync()}
          onCancel={viewModel.ownedItems.cancelSync}
        />
      )}
    </>
  );
}
