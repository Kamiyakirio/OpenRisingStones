/** Owns the verified account, session expiry, and login dialog lifecycle. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSdoLoginStatus,
  logoutSdo,
  signInRisingStones,
} from "../api/sdoLogin";
import type { AutoSignInStatus, LoginProfile } from "../types";
import { SDO_AUTHENTICATION_REQUIRED_EVENT } from "../utils/authEvents";

export function useAuthSession() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);
  const [loginChecking, setLoginChecking] = useState(true);
  const [loginExpired, setLoginExpired] = useState(false);
  const [signInStatus, setSignInStatus] = useState<AutoSignInStatus>("idle");
  const signInAttempt = useRef<ReturnType<typeof signInRisingStones> | null>(
    null,
  );

  useEffect(() => {
    let disposed = false;
    const requireAuthentication = () => {
      signInAttempt.current = null;
      setSignInStatus("idle");
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
        setLoginProfile(status.authenticated ? status.profile : null);
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

  const startSignIn = useCallback(() => {
    const attempt = signInRisingStones();
    signInAttempt.current = attempt;
    setSignInStatus("pending");
    void attempt.then(
      (result) => {
        if (signInAttempt.current === attempt) setSignInStatus(result.status);
      },
      () => {
        if (signInAttempt.current === attempt) setSignInStatus("failed");
      },
    );
  }, []);

  useEffect(() => {
    if (loginChecking || !loginProfile) return;
    if (!signInAttempt.current) startSignIn();
  }, [loginChecking, loginProfile, startSignIn]);

  const retrySignIn = useCallback(() => {
    if (loginProfile) startSignIn();
  }, [loginProfile, startSignIn]);

  const loginSucceeded = useCallback((profile: LoginProfile) => {
    signInAttempt.current = null;
    setSignInStatus("idle");
    setLoginProfile(profile);
    setLoginExpired(false);
    setLoginChecking(false);
  }, []);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const logout = useCallback(async () => {
    await logoutSdo();
    signInAttempt.current = null;
    setSignInStatus("idle");
    setLoginProfile(null);
    setLoginExpired(false);
    setLoginOpen(false);
  }, []);

  return {
    loginOpen,
    loginProfile,
    loginChecking,
    loginExpired,
    signInStatus,
    retrySignIn,
    loginSucceeded,
    openLogin,
    closeLogin,
    logout,
  };
}
