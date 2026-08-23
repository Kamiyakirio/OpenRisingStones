/** Application shell that composes independent discovery and login features. */
import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { DiscoveryFilters } from "./components/DiscoveryFilters";
import { GlamourGallery } from "./components/GlamourGallery";
import { GlamourHero } from "./components/GlamourHero";
import { LoginDialog } from "./components/LoginDialog";
import { SiteFooter } from "./components/SiteFooter";
import { useGlamourDiscovery } from "./hooks/useGlamourDiscovery";
import { getSdoLoginStatus, type LoginProfile } from "./services/sdoLogin";
import "./App.css";

function App() {
  const discovery = useGlamourDiscovery();
  const [dark, setDark] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);

  useEffect(() => {
    void getSdoLoginStatus()
      .then((status) => setLoginProfile(status.profile))
      .catch(() => undefined);
  }, []);

  return (
    <div className={dark ? "app theme-dark" : "app"}>
      <AppHeader
        dark={dark}
        profile={loginProfile}
        onToggleTheme={() => setDark((current) => !current)}
        onOpenLogin={() => setLoginOpen(true)}
      />

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
          onClearSearch={() => discovery.setQuery("")}
          onRetry={discovery.retry}
          onLoadMore={discovery.loadMore}
        />
      </main>

      <SiteFooter />
      {loginOpen && (
        <LoginDialog
          onClose={() => setLoginOpen(false)}
          onSuccess={setLoginProfile}
        />
      )}
    </div>
  );
}

export default App;
