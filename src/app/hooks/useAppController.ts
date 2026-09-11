/** Composes feature authentication with application navigation, theme, and settings. */
import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "../../features/auth/hooks/useAuthSession";
import { useNetworkLog } from "./useNetworkLog";

import { featureFromHash, type ActiveFeature } from "../navigation";
export type { ActiveFeature } from "../navigation";

export function useAppController() {
  const auth = useAuthSession();
  useNetworkLog();
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("ors.theme") === "dark";
    } catch {
      return false;
    }
  });
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>(() =>
    readInitialFeature(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openGlamour = useCallback(
    () => navigateToFeature(setActiveFeature, "glamour"),
    [],
  );
  const openRecruit = useCallback(
    () => navigateToFeature(setActiveFeature, "recruit"),
    [],
  );
  const openTeleport = useCallback(
    () => navigateToFeature(setActiveFeature, "teleport"),
    [],
  );
  const openFishing = useCallback(
    () => navigateToFeature(setActiveFeature, "fishing"),
    [],
  );
  const goHome = useCallback(
    () => navigateToFeature(setActiveFeature, "home"),
    [],
  );
  const openGearing = useCallback(
    () => navigateToFeature(setActiveFeature, "gearing"),
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem("ors.theme", dark ? "dark" : "light");
    } catch {
      /* The in-memory theme remains usable without storage. */
    }
  }, [dark]);
  useEffect(() => {
    const restore = () =>
      setActiveFeature((current) => readInitialFeature(current));
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
  const toggleTheme = useCallback(() => setDark((current) => !current), []);
  const navigate = useCallback(
    (feature: ActiveFeature) => navigateToFeature(setActiveFeature, feature),
    [],
  );

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return {
    ...auth,
    dark,
    activeFeature,
    navigate,
    settingsOpen,
    openGlamour,
    openRecruit,
    openTeleport,
    openGearing,
    openFishing,
    goHome,
    toggleTheme,
    openSettings,
    closeSettings,
  };
}

export type AppController = ReturnType<typeof useAppController>;

function readInitialFeature(fallback: ActiveFeature = "home"): ActiveFeature {
  return featureFromHash(window.location.hash, fallback);
}

function navigateToFeature(
  setFeature: (feature: ActiveFeature) => void,
  feature: ActiveFeature,
) {
  const hash = feature === "home" ? "" : `#${feature}`;
  window.history.pushState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash}`,
  );
  setFeature(feature);
  window.scrollTo({ top: 0 });
}
