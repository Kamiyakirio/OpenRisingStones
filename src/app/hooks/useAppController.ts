/** Composes feature authentication with application navigation, theme, and settings. */
import { useCallback, useState } from "react";
import { useAuthSession } from "../../features/auth/hooks/useAuthSession";
import { useNetworkLog } from "./useNetworkLog";

export type ActiveFeature = "home" | "glamour" | "recruit" | "teleport";

export function useAppController() {
  const auth = useAuthSession();
  useNetworkLog();
  const [dark, setDark] = useState(false);
  const [activeFeature, setActiveFeature] =
    useState<ActiveFeature>(readInitialFeature);
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
  const goHome = useCallback(
    () => navigateToFeature(setActiveFeature, "home"),
    [],
  );
  const toggleTheme = useCallback(() => setDark((current) => !current), []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return {
    ...auth,
    dark,
    activeFeature,
    settingsOpen,
    openGlamour,
    openRecruit,
    openTeleport,
    goHome,
    toggleTheme,
    openSettings,
    closeSettings,
  };
}

export type AppController = ReturnType<typeof useAppController>;

function readInitialFeature(): ActiveFeature {
  const feature = window.location.hash.slice(1);
  // Section hashes preserve the owning workspace when the webview reloads.
  if (feature.startsWith("teleport-")) return "teleport";
  return feature === "glamour" ||
    feature === "recruit" ||
    feature === "teleport"
    ? feature
    : "home";
}

function navigateToFeature(
  setFeature: (feature: ActiveFeature) => void,
  feature: ActiveFeature,
) {
  const hash = feature === "home" ? "" : `#${feature}`;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash}`,
  );
  setFeature(feature);
}
