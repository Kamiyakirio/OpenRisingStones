/** Owns login method selection, polling, validation, and success state. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { LoginMethod, LoginProfile, LoginProgress } from "../types";
import {
  hasAcceptedCookieLoginRisk,
  saveCookieLoginRiskAcceptance,
} from "../utils/cookieRiskConsent";
import {
  cancelSdoLogin,
  loginWithCookie,
  pollPushLogin,
  pollQrLogin,
  startPushLogin,
  startQrLogin,
} from "../api/sdoLogin";
import { extractCurlCredentials } from "../utils/curlCredentials";

export type CurlImportStatus =
  | "idle"
  | "success"
  | "invalid"
  | "missing_cookie"
  | "missing_user_agent"
  | "missing_both";

type ActiveLogin = {
  id: number;
  method: Exclude<LoginMethod, "cookie">;
};

type LoginDialogViewModelOptions = {
  onClose: () => void;
  onSuccess: (profile: LoginProfile) => void;
};

export function useLoginDialog({
  onClose,
  onSuccess,
}: LoginDialogViewModelOptions) {
  const onSuccessRef = useRef(onSuccess);
  const [method, setMethod] = useState<LoginMethod>("push");
  const [account, setAccount] = useState("");
  const [cookie, setCookie] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [curlRequest, setCurlRequest] = useState("");
  const [curlImportStatus, setCurlImportStatus] =
    useState<CurlImportStatus>("idle");
  const [riskAccepted, setRiskAccepted] = useState(hasAcceptedCookieLoginRisk);
  const [cookieAccessGranted, setCookieAccessGranted] = useState(
    hasAcceptedCookieLoginRisk,
  );
  const [activeLogin, setActiveLogin] = useState<ActiveLogin | null>(null);
  const [bindingRequired, setBindingRequired] = useState(false);
  const [progress, setProgress] = useState<LoginProgress | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [profile, setProfile] = useState<LoginProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const close = useCallback(async () => {
    if (activeLogin) {
      await cancelSdoLogin(activeLogin.id).catch(() => undefined);
    }
    onClose();
  }, [activeLogin, onClose]);

  useEffect(() => {
    if (!activeLogin) return;
    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      try {
        const result =
          activeLogin.method === "push"
            ? await pollPushLogin(activeLogin.id)
            : await pollQrLogin(activeLogin.id);
        if (cancelled) return;
        setProgress(result.status);
        if (result.status === "binding_required") {
          setActiveLogin(null);
          setBindingRequired(true);
          return;
        }
        if (result.status === "success" && result.profile) {
          setProfile(result.profile);
          setActiveLogin(null);
          onSuccessRef.current(result.profile);
          return;
        }
        timer = window.setTimeout(poll, 2_000);
      } catch (reason) {
        if (cancelled) return;
        setError(readError(reason));
        setActiveLogin(null);
      }
    };

    timer = window.setTimeout(poll, 2_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeLogin]);

  const switchMethod = async (nextMethod: LoginMethod) => {
    if (nextMethod === method && !bindingRequired) return;
    if (activeLogin) {
      await cancelSdoLogin(activeLogin.id).catch(() => undefined);
    }
    setMethod(nextMethod);
    setActiveLogin(null);
    setBindingRequired(false);
    setProgress(null);
    setQrImage(null);
    setProfile(null);
    setError(null);
  };

  const updateRiskAcceptance = (accepted: boolean) => {
    setRiskAccepted(accepted);
    saveCookieLoginRiskAcceptance(accepted);
  };

  const importCurlRequest = (request: string) => {
    setCurlRequest(request);
    if (!request.trim()) {
      setCurlImportStatus("idle");
      return;
    }

    const credentials = extractCurlCredentials(request);
    if (!credentials.recognized) {
      setCurlImportStatus("invalid");
      return;
    }

    if (credentials.cookie) setCookie(credentials.cookie);
    if (credentials.userAgent) setUserAgent(credentials.userAgent);
    if (credentials.cookie && credentials.userAgent) {
      setCurlRequest("");
      setCurlImportStatus("success");
    } else if (!credentials.cookie && !credentials.userAgent) {
      setCurlImportStatus("missing_both");
    } else if (!credentials.cookie) {
      setCurlImportStatus("missing_cookie");
    } else {
      setCurlImportStatus("missing_user_agent");
    }
  };

  const beginPush = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startPushLogin(account);
      setProgress(result.status);
      setActiveLogin({ id: result.loginId, method: "push" });
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const beginQr = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startQrLogin();
      setQrImage(result.qrImageDataUrl);
      setProgress(result.status);
      setActiveLogin({ id: result.loginId, method: "qr" });
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const beginCookie = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await loginWithCookie(cookie.trim(), userAgent.trim());
      if (result.status === "binding_required") {
        setCookie("");
        setProgress("binding_required");
        setBindingRequired(true);
        return;
      }
      if (result.status !== "success" || !result.profile) {
        throw new Error("登录验证未返回账号资料");
      }
      setCookie("");
      setProfile(result.profile);
      setProgress("success");
      onSuccessRef.current(result.profile);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  return {
    method,
    account,
    cookie,
    userAgent,
    curlRequest,
    curlImportStatus,
    riskAccepted,
    cookieAccessGranted,
    activeLogin,
    bindingRequired,
    progress,
    qrImage,
    profile,
    busy,
    error,
    setAccount,
    setCookie,
    setUserAgent,
    importCurlRequest,
    setCookieAccessGranted,
    close,
    switchMethod,
    updateRiskAcceptance,
    beginPush,
    beginQr,
    beginCookie,
  };
}

export type LoginDialogState = ReturnType<typeof useLoginDialog>;

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "登录失败，请稍后重试";
}
