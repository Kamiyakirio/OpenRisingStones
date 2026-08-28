/** Coordinates application navigation, theme, dialogs, and authentication state. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { LoginProfile } from "@/features/auth/model/auth";
import { SDO_AUTHENTICATION_REQUIRED_EVENT } from "@/features/auth/lib/authEvents";
import { getSdoLoginStatus, logoutSdo } from "@/features/auth/api/sdoLogin";
import { isTauriRuntime } from "@/shared/lib/runtime";

export type ActiveFeature = "home" | "glamour" | "recruit";

export function useAppViewModel() {
  const [dark, setDark] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("home");
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
  const openGlamour = useCallback(() => setActiveFeature("glamour"), []);
  const openRecruit = useCallback(() => setActiveFeature("recruit"), []);
  const goHome = useCallback(() => setActiveFeature("home"), []);
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

function writeNetworkConsole(message: string) {
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const phase = typeof payload.phase === "string" ? payload.phase : "log";
    console.log(`[network][${phase}]`, payload);
  } catch {
    console.log("[network]", message);
  }
}
