/**
 * 盛趣登录弹窗：提供叨鱼一键确认、二维码扫描和受风险确认保护的 Cookie 登录。
 * 所有成功状态均来自后端对石之家 isLogin 接口的二次验证。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Cookie,
  DeviceMobile,
  QrCode,
  ShieldWarning,
  SpinnerGap,
  UserCircleCheck,
  X,
} from "@phosphor-icons/react";
import {
  cancelSdoLogin,
  loginWithCookie,
  pollPushLogin,
  pollQrLogin,
  startPushLogin,
  startQrLogin,
  type LoginProfile,
  type LoginProgress,
} from "../services/sdoLogin";
import {
  hasAcceptedCookieLoginRisk,
  saveCookieLoginRiskAcceptance,
} from "../services/cookieRiskConsent";

type LoginMethod = "push" | "qr" | "cookie";
type ActiveLogin = { id: number; method: Exclude<LoginMethod, "cookie"> };

type LoginDialogProps = {
  onClose: () => void;
  onSuccess: (profile: LoginProfile) => void;
};

const METHOD_LABELS: Record<LoginMethod, string> = {
  push: "一键登录",
  qr: "扫码登录",
  cookie: "Cookie 登录",
};

export function LoginDialog({ onClose, onSuccess }: LoginDialogProps) {
  const [method, setMethod] = useState<LoginMethod>("push");
  const [account, setAccount] = useState("");
  const [cookie, setCookie] = useState("");
  const [riskAccepted, setRiskAccepted] = useState(hasAcceptedCookieLoginRisk);
  const [cookieAccessGranted, setCookieAccessGranted] = useState(false);
  const [activeLogin, setActiveLogin] = useState<ActiveLogin | null>(null);
  const [progress, setProgress] = useState<LoginProgress | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [profile, setProfile] = useState<LoginProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const closeDialog = useCallback(async () => {
    if (activeLogin)
      await cancelSdoLogin(activeLogin.id).catch(() => undefined);
    onClose();
  }, [activeLogin, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void closeDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog]);

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
        if (result.status === "success" && result.profile) {
          setProfile(result.profile);
          setActiveLogin(null);
          onSuccess(result.profile);
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
  }, [activeLogin, onSuccess]);

  const switchMethod = async (nextMethod: LoginMethod) => {
    if (nextMethod === method) return;
    if (activeLogin)
      await cancelSdoLogin(activeLogin.id).catch(() => undefined);
    setMethod(nextMethod);
    setActiveLogin(null);
    setProgress(null);
    setQrImage(null);
    setProfile(null);
    setError(null);
    setCookieAccessGranted(false);
  };

  const updateRiskAcceptance = (accepted: boolean) => {
    setRiskAccepted(accepted);
    saveCookieLoginRiskAcceptance(accepted);
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
      const result = await loginWithCookie(cookie);
      if (result.status !== "success" || !result.profile)
        throw new Error("登录验证未返回账号资料");
      setCookie("");
      setProfile(result.profile);
      setProgress("success");
      onSuccess(result.profile);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="login-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void closeDialog();
      }}
    >
      <section
        className="login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <header className="login-dialog-header">
          <div>
            <span>石之家账号</span>
            <h2 id="login-title">登录盛趣通行证</h2>
          </div>
          <button
            ref={closeButton}
            className="dialog-close"
            type="button"
            aria-label="关闭登录窗口"
            onClick={() => void closeDialog()}
          >
            <X />
          </button>
        </header>

        <div className="login-methods" role="tablist" aria-label="登录方式">
          <MethodTab
            method="push"
            current={method}
            icon={<DeviceMobile />}
            onSelect={switchMethod}
          />
          <MethodTab
            method="qr"
            current={method}
            icon={<QrCode />}
            onSelect={switchMethod}
          />
          <MethodTab
            method="cookie"
            current={method}
            icon={<Cookie />}
            onSelect={switchMethod}
          />
        </div>

        <div className="login-content">
          {profile ? (
            <LoginSuccess profile={profile} onDone={() => void closeDialog()} />
          ) : method === "push" ? (
            <div className="login-pane" role="tabpanel">
              <BrowserSessionWarning />
              <div className="login-intro">
                <DeviceMobile weight="duotone" />
                <div>
                  <h3>在叨鱼中确认登录</h3>
                  <p>输入绑定的手机号或盛趣账号，我们会发送一次登录确认。</p>
                </div>
              </div>
              <label className="login-field">
                手机号或盛趣账号
                <input
                  autoComplete="username"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="请输入账号"
                  disabled={Boolean(activeLogin)}
                />
              </label>
              {progress && (
                <ProgressMessage progress={progress} method="push" />
              )}
              {!activeLogin && (
                <button
                  className="login-primary"
                  type="button"
                  disabled={busy || account.trim().length < 5}
                  onClick={() => void beginPush()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap className="spin" />
                      正在发送
                    </>
                  ) : (
                    "发送一键登录确认"
                  )}
                </button>
              )}
            </div>
          ) : method === "qr" ? (
            <div className="login-pane" role="tabpanel">
              <BrowserSessionWarning />
              {qrImage ? (
                <div className="qr-stage">
                  <div className="qr-frame">
                    <img src={qrImage} alt="盛趣通行证登录二维码" />
                  </div>
                  <ProgressMessage
                    progress={progress ?? "awaiting_scan"}
                    method="qr"
                  />
                </div>
              ) : (
                <div className="login-intro qr-intro">
                  <QrCode weight="duotone" />
                  <div>
                    <h3>使用叨鱼扫描二维码</h3>
                    <p>二维码仅用于本次登录，生成后请在 2 分钟内完成确认。</p>
                  </div>
                </div>
              )}
              {!activeLogin && !qrImage && (
                <button
                  className="login-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void beginQr()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap className="spin" />
                      正在生成
                    </>
                  ) : (
                    "生成登录二维码"
                  )}
                </button>
              )}
              {!activeLogin && qrImage && progress !== "success" && (
                <button
                  className="login-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void beginQr()}
                >
                  重新生成二维码
                </button>
              )}
            </div>
          ) : cookieAccessGranted ? (
            <CookieLoginForm
              cookie={cookie}
              busy={busy}
              onCookieChange={setCookie}
              onReviewRisk={() => setCookieAccessGranted(false)}
              onLogin={beginCookie}
            />
          ) : (
            <CookieRiskGate
              accepted={riskAccepted}
              onAcceptedChange={updateRiskAcceptance}
              onContinue={() => setCookieAccessGranted(true)}
            />
          )}
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CookieRiskGate({
  accepted,
  onAcceptedChange,
  onContinue,
}: {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <div className="login-pane cookie-risk-page" role="tabpanel">
      <div className="cookie-risk-heading">
        <ShieldWarning weight="fill" />
        <div>
          <span>高级登录方式</span>
          <h3>使用 Cookie 前请确认风险</h3>
        </div>
      </div>
      <div className="cookie-warning" role="note">
        <ShieldWarning weight="fill" />
        <div>
          <strong>此功能仅面向了解 Cookie 的用户</strong>
          <p>这是为知道如何使用此功能的用户准备的，默认已知晓所有安全风险。</p>
          <p>如不了解此方面，请勿使用此种方法登录。</p>
        </div>
      </div>
      <label className="risk-checkbox risk-checkbox-panel">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span>我已知晓安全风险</span>
      </label>
      <button
        className="login-primary"
        type="button"
        disabled={!accepted}
        onClick={onContinue}
      >
        我已了解，继续使用
      </button>
    </div>
  );
}

function CookieLoginForm({
  cookie,
  busy,
  onCookieChange,
  onReviewRisk,
  onLogin,
}: {
  cookie: string;
  busy: boolean;
  onCookieChange: (cookie: string) => void;
  onReviewRisk: () => void;
  onLogin: () => Promise<void>;
}) {
  return (
    <div className="login-pane" role="tabpanel">
      <div className="cookie-form-heading">
        <div>
          <h3>粘贴已有 Cookie</h3>
          <p>验证成功后，会话会由系统安全存储加密保留在本机。</p>
        </div>
        <button type="button" onClick={onReviewRisk}>
          查看风险说明
        </button>
      </div>
      <label className="login-field">
        Cookie
        <textarea
          value={cookie}
          onChange={(event) => onCookieChange(event.target.value)}
          placeholder="粘贴完整 Cookie 内容"
          rows={5}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <button
        className="login-primary"
        type="button"
        disabled={busy || !cookie.trim()}
        onClick={() => void onLogin()}
      >
        {busy ? (
          <>
            <SpinnerGap className="spin" />
            正在验证
          </>
        ) : (
          "验证 Cookie 并登录"
        )}
      </button>
    </div>
  );
}

function MethodTab({
  method,
  current,
  icon,
  onSelect,
}: {
  method: LoginMethod;
  current: LoginMethod;
  icon: React.ReactNode;
  onSelect: (method: LoginMethod) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current === method}
      className={current === method ? "active" : ""}
      onClick={() => void onSelect(method)}
    >
      {icon}
      <span>{METHOD_LABELS[method]}</span>
    </button>
  );
}

function BrowserSessionWarning() {
  return (
    <div className="session-warning" role="note">
      <ShieldWarning />
      <span>使用此方式登录会使已登录的浏览器登录态失效。</span>
    </div>
  );
}

function ProgressMessage({
  progress,
  method,
}: {
  progress: LoginProgress;
  method: "push" | "qr";
}) {
  const text =
    progress === "scanned"
      ? "已扫描，请在手机上确认登录"
      : method === "push"
        ? "确认已发送，请在叨鱼中允许登录"
        : "等待扫描二维码";
  return (
    <div className="login-progress" role="status">
      <SpinnerGap className="spin" />
      <span>{text}</span>
    </div>
  );
}

function LoginSuccess({
  profile,
  onDone,
}: {
  profile: LoginProfile;
  onDone: () => void;
}) {
  const location = [profile.areaName, profile.groupName]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="login-success" role="status">
      <CheckCircle weight="fill" />
      <span>登录状态已验证</span>
      <h3>{profile.characterName || profile.displayAccount}</h3>
      {location && <p>{location}</p>}
      <div className="verified-label">
        <UserCircleCheck />
        石之家已返回有效登录信息
      </div>
      <button className="login-primary" type="button" onClick={onDone}>
        完成
      </button>
    </div>
  );
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "登录失败，请稍后重试";
}
