/** Application shell that routes between the product home and feature workspaces. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { DiscoveryFilters } from "./components/DiscoveryFilters";
import { GlamourGallery } from "./components/GlamourGallery";
import { GlamourHero } from "./components/GlamourHero";
import { GlamourDetailView } from "./components/GlamourDetailView";
import { HomePage } from "./components/HomePage";
import { LoginDialog } from "./components/LoginDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { SiteFooter } from "./components/SiteFooter";
import { useGlamourDiscovery } from "./hooks/useGlamourDiscovery";
import { isTauriRuntime, type Glamour } from "./services/glamourApi";
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
          onBack={handleCloseDetail}
          onToggleSave={discovery.toggleSave}
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
            query={discovery.query}
            raceId={discovery.raceId}
            genderId={discovery.genderId}
            preview={discovery.preview}
            onQueryChange={discovery.setQuery}
            onRaceChange={discovery.setRaceId}
            onGenderChange={discovery.setGenderId}
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
            onClearSearch={() => discovery.setQuery("")}
            onRetry={discovery.retry}
            onLoadMore={discovery.loadMore}
          />
        </main>
      )}
      <SiteFooter />
      {loginOpen && (
        <LoginDialog onClose={onCloseLogin} onSuccess={handleLoginSuccess} />
      )}
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
