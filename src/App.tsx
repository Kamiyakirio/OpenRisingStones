/** Application shell that routes between the product home and feature workspaces. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { DiscoveryFilters } from "./components/DiscoveryFilters";
import { EquipmentSearchPage } from "./components/EquipmentSearchPage";
import { GlamourGallery } from "./components/GlamourGallery";
import { GlamourHero } from "./components/GlamourHero";
import { GlamourDetailView } from "./components/GlamourDetailView";
import { HomePage } from "./components/HomePage";
import { LoginDialog } from "./components/LoginDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { SiteFooter } from "./components/SiteFooter";
import { WikiVerificationStatus } from "./components/WikiVerificationStatus";
import { useGlamourDiscovery } from "./hooks/useGlamourDiscovery";
import { useWikiItem } from "./hooks/useWikiItem";
import type { EquipmentSearchItem } from "./services/equipmentApi";
import {
  isTauriRuntime,
  type Glamour,
  type GlamourEquipment,
} from "./services/glamourApi";
import { getSdoLoginStatus, type LoginProfile } from "./services/sdoLogin";
import "./App.css";

function App() {
  const [dark, setDark] = useState(false);
  const [activeFeature, setActiveFeature] = useState<"home" | "glamour">(
    "home",
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    const initialize = async () => {
      if (isTauriRuntime()) {
        try {
          const stopListening = await listen<BackendLogPayload>(
            "log://log",
            (event) => writeNetworkConsole(event.payload.message),
          );
          if (disposed) {
            stopListening();
            return;
          }
          unlisten = stopListening;
        } catch {
          // Network requests still work if the debug console bridge is unavailable.
        }
      }
      if (disposed) return;
      void getSdoLoginStatus()
        .then((status) => setLoginProfile(status.profile))
        .catch(() => undefined);
    };
    void initialize();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return (
    <div className={dark ? "app theme-dark" : "app"}>
      {activeFeature === "home" ? (
        <HomePage
          dark={dark}
          onOpenGlamour={() => setActiveFeature("glamour")}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTheme={() => setDark((current) => !current)}
        />
      ) : (
        <GlamourWorkspace
          dark={dark}
          loginOpen={loginOpen}
          profile={loginProfile}
          onCloseLogin={() => setLoginOpen(false)}
          onGoHome={() => setActiveFeature("home")}
          onToggleTheme={() => setDark((current) => !current)}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onLoginSuccess={setLoginProfile}
        />
      )}
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

type GlamourWorkspaceProps = {
  dark: boolean;
  loginOpen: boolean;
  profile: LoginProfile | null;
  onCloseLogin: () => void;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLoginSuccess: (profile: LoginProfile) => void;
};

/** Keeps glamour data fetching isolated so the home screen stays lightweight. */
function GlamourWorkspace({
  dark,
  loginOpen,
  profile,
  onCloseLogin,
  onGoHome,
  onToggleTheme,
  onOpenLogin,
  onOpenSettings,
  onLoginSuccess,
}: GlamourWorkspaceProps) {
  const discovery = useGlamourDiscovery();
  const wiki = useWikiItem();
  const [selectedGlamour, setSelectedGlamour] = useState<Glamour | null>(null);
  const galleryScrollPosition = useRef(0);

  /** A verified login immediately retries the API request with the stored session. */
  const handleLoginSuccess = (nextProfile: LoginProfile) => {
    onLoginSuccess(nextProfile);
    discovery.retry();
  };

  const handleOpenDetail = (glamour: Glamour) => {
    galleryScrollPosition.current = window.scrollY;
    setSelectedGlamour(glamour);
    window.scrollTo({ top: 0 });
  };

  const handleCloseDetail = () => {
    setSelectedGlamour(null);
    queueMicrotask(() =>
      window.scrollTo({ top: galleryScrollPosition.current }),
    );
  };

  const handleSelectEquipment = (equipment: EquipmentSearchItem) => {
    discovery.selectEquipment(equipment);
    void wiki.load(equipment.name, equipment.id).then((item) => {
      if (item) {
        discovery.registerEquivalentEquipment(equipment.id, item.modelItems);
      }
    });
  };

  const handleSearchDetailEquipment = (
    equipment: GlamourEquipment,
    category: string,
  ) => {
    if (!equipment.name || equipment.equipmentId <= 0) return;
    setSelectedGlamour(null);
    handleSelectEquipment({
      id: equipment.equipmentId,
      name: equipment.name,
      category,
      icon: equipment.icon ?? "",
    });
  };

  return (
    <>
      <AppHeader
        dark={dark}
        profile={profile}
        onGoHome={onGoHome}
        onToggleTheme={onToggleTheme}
        onOpenLogin={onOpenLogin}
        onOpenSettings={onOpenSettings}
      />
      {selectedGlamour ? (
        <GlamourDetailView
          glamour={selectedGlamour}
          saved={discovery.saved.includes(selectedGlamour.id)}
          wiki={wiki}
          onBack={handleCloseDetail}
          onSearchEquipment={handleSearchDetailEquipment}
          onToggleSave={discovery.toggleSave}
        />
      ) : discovery.equipmentResultsOpen ? (
        <EquipmentSearchPage
          query={discovery.query}
          items={discovery.equipmentCandidates}
          page={discovery.equipmentPage}
          pageSize={discovery.equipmentPageSize}
          loading={discovery.equipmentSearchLoading}
          error={discovery.equipmentSearchError}
          canShowPrevious={discovery.canShowPreviousEquipmentPage}
          canShowNext={discovery.canShowNextEquipmentPage}
          onBack={discovery.closeEquipmentResults}
          onSelect={handleSelectEquipment}
          onShowPrevious={discovery.showPreviousEquipmentPage}
          onShowNext={discovery.showNextEquipmentPage}
          onRetry={discovery.retryEquipmentSearch}
          onPageSizeChange={discovery.changeEquipmentPageSize}
        />
      ) : (
        <main id="top">
          <GlamourHero
            featured={discovery.featured}
            total={discovery.total}
            raceId={discovery.raceId}
            genderId={discovery.genderId}
          />
          <DiscoveryFilters
            searchMode={discovery.searchMode}
            query={discovery.query}
            activeQuery={discovery.activeQuery}
            raceId={discovery.raceId}
            genderId={discovery.genderId}
            searchLoading={
              discovery.searchMode === "title"
                ? discovery.loading
                : discovery.equipmentSearchLoading
            }
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
            onRaceChange={discovery.setRaceId}
            onGenderChange={discovery.setGenderId}
            onToggleEquivalent={discovery.toggleEquivalentEquipment}
            onSelectAllEquivalent={discovery.selectAllEquivalentEquipment}
            onClearEquivalent={discovery.clearEquivalentEquipment}
          />
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
            onOpenDetail={handleOpenDetail}
            onClearSearch={discovery.clearSearch}
            onRetry={discovery.retry}
            onLoadMore={discovery.loadMore}
          />
        </main>
      )}
      <SiteFooter />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={handleLoginSuccess} />
      )}
      <WikiVerificationStatus
        status={wiki.status}
        itemName={wiki.itemName}
        error={wiki.error}
        onShow={() => void wiki.showVerification()}
        onCancel={() => void wiki.cancelVerification()}
        onDismiss={wiki.dismissError}
      />
    </>
  );
}

export default App;

type BackendLogPayload = {
  message: string;
  level: string;
};

function writeNetworkConsole(message: string) {
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const phase = typeof payload.phase === "string" ? payload.phase : "log";
    console.log(`[network][${phase}]`, payload);
  } catch {
    console.log("[network]", message);
  }
}
