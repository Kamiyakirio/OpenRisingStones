/** Owns the verified account, session expiry, and login dialog lifecycle. */
import { useCallback, useEffect, useState } from "react";
import { getSdoLoginStatus, logoutSdo } from "../api/sdoLogin";
import type { LoginProfile } from "../types";
import { SDO_AUTHENTICATION_REQUIRED_EVENT } from "../utils/authEvents";

export function useAuthSession() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);
  const [loginChecking, setLoginChecking] = useState(true);
  const [loginExpired, setLoginExpired] = useState(false);

  useEffect(() => {
    let disposed = false;
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
      // Strict Mode and unmounts must not apply a stale status response.
      disposed = true;
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
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const logout = useCallback(async () => {
    await logoutSdo();
    setLoginProfile(null);
    setLoginExpired(false);
    setLoginOpen(false);
  }, []);

  return {
    loginOpen,
    loginProfile,
    loginChecking,
    loginExpired,
    loginSucceeded,
    openLogin,
    closeLogin,
    logout,
  };
}
