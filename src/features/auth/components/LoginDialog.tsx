/**
 * 盛趣登录弹窗：提供叨鱼一键确认、二维码扫描和受风险确认保护的 Cookie 登录。
 * 登录成功必须同时通过账号验证与石之家官方角色绑定检查。
 */
import { useEffect, useRef } from "react";
import {
  CheckCircle,
  ClipboardText,
  Cookie,
  DeviceMobile,
  IdentificationCard,
  QrCode,
  ShieldWarning,
  SpinnerGap,
  UserCircleCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { LoginMethod, LoginProfile, LoginProgress } from "../types";
import { type CurlImportStatus, useLoginDialog } from "../hooks/useLoginDialog";

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
  const {
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
    close: closeDialog,
    switchMethod,
    updateRiskAcceptance,
    beginPush,
    beginQr,
    beginCookie,
  } = useLoginDialog({ onClose, onSuccess });
  const closeButton = useRef<HTMLButtonElement>(null);

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
          ) : bindingRequired ? (
            <CharacterBindingRequired onDone={() => void closeDialog()} />
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
              userAgent={userAgent}
              curlRequest={curlRequest}
              curlImportStatus={curlImportStatus}
              busy={busy}
              onCookieChange={setCookie}
              onUserAgentChange={setUserAgent}
              onCurlRequestChange={importCurlRequest}
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

function CharacterBindingRequired({ onDone }: { onDone: () => void }) {
  return (
    <div className="login-pane binding-required" role="status">
      <IdentificationCard weight="duotone" />
      <span>尚未绑定角色</span>
      <h3>请先在石之家官网绑定角色</h3>
      <div className="binding-required-copy">
        <p>当前盛趣账号已经通过验证，但石之家没有返回可用角色。</p>
        <p>请在官网完成角色绑定后，再回到 App 重新登录。</p>
      </div>
      <button className="login-primary" type="button" onClick={onDone}>
        知道了
      </button>
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
  userAgent,
  curlRequest,
  curlImportStatus,
  busy,
  onCookieChange,
  onUserAgentChange,
  onCurlRequestChange,
  onReviewRisk,
  onLogin,
}: {
  cookie: string;
  userAgent: string;
  curlRequest: string;
  curlImportStatus: CurlImportStatus;
  busy: boolean;
  onCookieChange: (cookie: string) => void;
  onUserAgentChange: (userAgent: string) => void;
  onCurlRequestChange: (request: string) => void;
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
      <div className="curl-import">
        <div className="curl-import-heading">
          <ClipboardText weight="duotone" />
          <div>
            <strong>从 Chrome 复制请求</strong>
            <span>在网络请求菜单中选择“复制为 cURL (bash)”</span>
          </div>
        </div>
        <textarea
          className="curl-import-input"
          aria-label="粘贴从 Chrome 复制的 cURL bash 请求"
          value={curlRequest}
          onChange={(event) => onCurlRequestChange(event.target.value)}
          placeholder="在这里粘贴，自动提取 Cookie 和 User-Agent"
          rows={3}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <CurlImportMessage status={curlImportStatus} />
      </div>
      <label className="login-field">
        User-Agent
        <input
          value={userAgent}
          onChange={(event) => onUserAgentChange(event.target.value)}
          placeholder="粘贴获取 Cookie 时浏览器的 User-Agent"
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <span className="login-field-hint">
          必须与 Cookie 来源浏览器一致，否则石之家会拒绝该会话。
        </span>
      </label>
      <label className="login-field">
        Cookie
        <textarea
          value={cookie}
          onChange={(event) => onCookieChange(event.target.value)}
          placeholder="粘贴完整 Cookie 内容"
          rows={5}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <button
        className="login-primary"
        type="button"
        disabled={busy || !cookie.trim() || !userAgent.trim()}
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

const CURL_IMPORT_MESSAGES: Record<
  Exclude<CurlImportStatus, "idle">,
  string
> = {
  success: "已识别并填入 Cookie 和 User-Agent，请核对后登录。",
  invalid: "未识别为 cURL (bash)，请确认复制格式后重新粘贴。",
  missing_cookie: "已识别 cURL，但请求中没有 Cookie 请求头。",
  missing_user_agent: "已识别 cURL，但请求中没有 User-Agent 请求头。",
  missing_both: "已识别 cURL，但请求中没有 Cookie 和 User-Agent 请求头。",
};

function CurlImportMessage({ status }: { status: CurlImportStatus }) {
  if (status === "idle") return null;
  const successful = status === "success";
  return (
    <div
      className={`curl-import-message ${successful ? "is-success" : "is-error"}`}
      role={successful ? "status" : "alert"}
    >
      {successful ? (
        <CheckCircle weight="fill" />
      ) : (
        <WarningCircle weight="fill" />
      )}
      <span>{CURL_IMPORT_MESSAGES[status]}</span>
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
