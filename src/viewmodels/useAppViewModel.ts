/** Coordinates application navigation, theme, dialogs, and authentication state. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { LoginProfile } from "../features/auth/types";
import { SDO_AUTHENTICATION_REQUIRED_EVENT } from "../features/auth/utils/authEvents";
import { getSdoLoginStatus, logoutSdo } from "../features/auth/api/sdoLogin";
import { isTauriRuntime } from "../shared/utils/runtime";

export type ActiveFeature = "home" | "glamour" | "recruit" | "teleport";

export function useAppViewModel() {
  const [dark, setDark] = useState(false);
  const [activeFeature, setActiveFeature] =
    useState<ActiveFeature>(readInitialFeature);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);
  const [loginChecking, setLoginChecking] = useState(true);
  const [loginExpired, setLoginExpired] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    const requireAuthentication = () => {
      setLoginProfile(null);
      setLoginExpired(true);
      setLoginOpen(false);
    };
    window.addEventListener(
      SDO_AUTHENTICATION_REQUIRED_EVENT,
      requireAuthentication,
    );

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
          // Network requests remain available if the debug bridge cannot start.
        }
      }
      if (disposed) return;
      try {
        const status = await getSdoLoginStatus();
        if (disposed) return;
        setLoginProfile(status.profile);
        setLoginExpired(false);
      } catch {
        if (!disposed) setLoginProfile(null);
      } finally {
        if (!disposed) setLoginChecking(false);
      }
    };

    void initialize();
    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener(
        SDO_AUTHENTICATION_REQUIRED_EVENT,
        requireAuthentication,
      );
    };
  }, []);

  const loginSucceeded = useCallback((profile: LoginProfile) => {
    setLoginProfile(profile);
    setLoginExpired(false);
    setLoginChecking(false);
  }, []);
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
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const logout = useCallback(async () => {
    await logoutSdo();
    setLoginProfile(null);
    setLoginExpired(false);
    setLoginOpen(false);
  }, []);

  return {
    dark,
    activeFeature,
    loginOpen,
    settingsOpen,
    loginProfile,
    loginChecking,
    loginExpired,
    openGlamour,
    openRecruit,
    openTeleport,
    goHome,
    toggleTheme,
    openLogin,
    closeLogin,
    openSettings,
    closeSettings,
    loginSucceeded,
    logout,
  };
}

export type AppViewModel = ReturnType<typeof useAppViewModel>;

type BackendLogPayload = {
  message: string;
  level: string;
};

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

function writeNetworkConsole(message: string) {
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const phase = typeof payload.phase === "string" ? payload.phase : "log";
    console.log(`[network][${phase}]`, payload);
  } catch {
    console.log("[network]", message);
  }
}
