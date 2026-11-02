/** Account login methods with explicit consent and bound-character verification. */
import clsx from "clsx";
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
import { useRef } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { type CurlImportStatus, useLoginDialog } from "../hooks/useLoginDialog";
import type { LoginMethod, LoginProfile, LoginProgress } from "../types";
import { authDialogCloseClasses } from "../utilityClasses";

/** Reused presentation strings stay static and are allocated once for this module. */
const loginSectionHeadingClasses =
  "mx-0 mt-0 mb-1.5 text-base text-[17px] font-semibold";
const loginFieldClasses =
  "login-field grid gap-2 text-[12px] font-bold text-ink";
const loginInputClasses =
  "box-border min-h-11.5 w-full rounded-control border border-solid border-control bg-canvas px-[13px] py-0 font-medium text-ink outline-none [font:inherit] [transition:border-color_160ms_ease,_box-shadow_160ms_ease] placeholder:text-muted placeholder:opacity-78 focus:border-accent focus:shadow-[none]";
const loginPrimaryButtonClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] login-primary inline-flex min-h-11.5 items-center justify-center gap-2 rounded-control border border-solid border-accent bg-accent px-4.5 py-0 text-sm font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-46 dark:text-on-accent";
const loginSpinnerClasses =
  "spin h-[17px] w-[17px] animate-[login-spin_900ms_linear_infinite]";
const loginFullWidthPrimaryClasses = `${loginPrimaryButtonClasses} w-full`;
const loginStatusHeadingClasses =
  "mx-0 mt-1 mb-0 text-base text-[18px] font-semibold";
const loginStatusCopyClasses = "mx-0 mt-1.5 mb-0 text-[12px] leading-[1.55]";

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
  } = useLoginDialog({
    onClose,
    onSuccess,
  });
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useDialogFocus(() => {
    void closeDialog();
  });
  return (
    <div
      className="login-backdrop fixed inset-0 z-30 grid place-items-center bg-[rgba(10,_15,_26,_0.64)] p-4 max-[700px]:items-end max-[700px]:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void closeDialog();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="login-dialog max-h-[calc(100dvh_-_32px)] w-[min(640px,_100%)] overflow-auto rounded-overlay border border-control bg-surface text-ink max-[700px]:max-h-[calc(100dvh_-_18px)] max-[700px]:w-full max-[700px]:rounded-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <header className="login-dialog-header flex items-start justify-between bg-tool-soft p-6 max-[700px]:px-5 max-[700px]:pt-5.5 max-[700px]:pb-[17px]">
          <div>
            <h2
              className="mx-0 mt-1.5 mb-0 font-sans text-lg font-semibold max-[700px]:text-lg"
              id="login-title"
            >
              登录盛趣通行证
            </h2>
          </div>
          <button
            ref={closeButton}
            className={authDialogCloseClasses}
            type="button"
            aria-label="关闭登录窗口"
            onClick={() => void closeDialog()}
          >
            <X className="size-5" />
          </button>
        </header>

        <div
          className="login-methods grid grid-cols-[repeat(3,_1fr)] border-b border-solid border-line px-7 py-0 max-[700px]:px-3 max-[700px]:py-0"
          role="tablist"
          aria-label="登录方式"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              ),
            );
            const current = tabs.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (current +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            event.preventDefault();
            tabs[next]?.focus();
            tabs[next]?.click();
          }}
        >
          <MethodTab
            method="push"
            current={method}
            icon={<DeviceMobile className="h-4.5 w-4.5 text-accent" />}
            onSelect={switchMethod}
          />
          <MethodTab
            method="qr"
            current={method}
            icon={<QrCode className="h-4.5 w-4.5 text-accent" />}
            onSelect={switchMethod}
          />
          <MethodTab
            method="cookie"
            current={method}
            icon={<Cookie className="h-4.5 w-4.5 text-accent" />}
            onSelect={switchMethod}
          />
        </div>

        <div className="login-content p-6 max-[700px]:px-5 max-[700px]:pt-5.5 max-[700px]:pb-6.5">
          {profile ? (
            <LoginSuccess profile={profile} onDone={() => void closeDialog()} />
          ) : bindingRequired ? (
            <CharacterBindingRequired onDone={() => void closeDialog()} />
          ) : method === "push" ? (
            <div className="login-pane grid gap-5" role="tabpanel">
              <BrowserSessionWarning />
              <div className="login-intro flex items-center gap-4 px-0.5 py-1">
                <DeviceMobile
                  className="h-12 w-12 shrink-0 text-accent"
                  weight="duotone"
                />
                <div>
                  <h3 className={loginSectionHeadingClasses}>
                    在叨鱼中确认登录
                  </h3>
                  <p className="m-0 text-sm leading-[1.6] text-muted">
                    输入绑定的手机号或盛趣账号，在叨鱼中确认。
                  </p>
                </div>
              </div>
              <label className={loginFieldClasses}>
                手机号或盛趣账号
                <input
                  className={loginInputClasses}
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
                  className={loginPrimaryButtonClasses}
                  type="button"
                  disabled={busy || account.trim().length < 5}
                  onClick={() => void beginPush()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap className={loginSpinnerClasses} />
                      正在发送
                    </>
                  ) : (
                    "发送一键登录确认"
                  )}
                </button>
              )}
            </div>
          ) : method === "qr" ? (
            <div className="login-pane grid gap-5" role="tabpanel">
              <BrowserSessionWarning />
              {qrImage ? (
                <div className="qr-stage grid justify-items-center gap-[17px] pt-0.5">
                  <div className="qr-frame grid h-47.5 w-47.5 place-items-center rounded-control border border-solid border-line bg-[#f7f8f5] shadow-[none]">
                    <img
                      className="h-40 w-40 [image-rendering:pixelated]"
                      src={qrImage}
                      alt="盛趣通行证登录二维码"
                    />
                  </div>
                  <ProgressMessage
                    progress={progress ?? "awaiting_scan"}
                    method="qr"
                    layout="qr-stage"
                  />
                </div>
              ) : (
                <div className="login-intro qr-intro flex items-center gap-4 px-0.5 py-1">
                  <QrCode
                    className="h-12 w-12 shrink-0 text-accent"
                    weight="duotone"
                  />
                  <div>
                    <h3 className={loginSectionHeadingClasses}>
                      使用叨鱼扫描二维码
                    </h3>
                    <p className="m-0 text-sm leading-[1.6] text-muted">
                      二维码仅用于本次登录，生成后请在 2 分钟内完成确认。
                    </p>
                  </div>
                </div>
              )}
              {!activeLogin && !qrImage && (
                <button
                  className={loginPrimaryButtonClasses}
                  type="button"
                  disabled={busy}
                  onClick={() => void beginQr()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap className={loginSpinnerClasses} />
                      正在生成
                    </>
                  ) : (
                    "生成登录二维码"
                  )}
                </button>
              )}
              {!activeLogin && qrImage && progress !== "success" && (
                <button
                  className="login-secondary inline-flex min-h-11.5 items-center justify-center gap-2 rounded-control border border-solid border-line bg-transparent px-4.5 py-0 text-sm font-bold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-accent hover:bg-selected"
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
            <div
              className="login-error mt-4.5 rounded-control bg-surface px-3.5 py-3 text-[12px] leading-[1.55] text-danger [border-left:1px_solid_var(--ors-color-danger)] dark:bg-surface dark:text-danger"
              role="alert"
            >
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
    <div
      className="login-pane binding-required grid justify-items-center gap-5 px-0 pt-1.5 pb-0.5 text-center"
      role="status"
    >
      <IdentificationCard className="h-13 w-13 text-accent" weight="duotone" />
      <span className="text-[12px] font-bold text-accent">尚未绑定角色</span>
      <h3 className="mx-0 mt-[-8px] mb-0 font-sans text-base text-[23px] font-semibold">
        请先在石之家官网绑定角色
      </h3>
      <div className="binding-required-copy box-border w-full rounded-control bg-hover px-4 py-3.5 text-left text-muted">
        <p className="m-0 text-[12px] leading-[1.65]">
          当前盛趣账号已经通过验证，但石之家没有返回可用角色。
        </p>
        <p className="m-0 mt-1.5 text-[12px] leading-[1.65]">
          请在官网完成角色绑定后，再回到 App 重新登录。
        </p>
      </div>
      <button
        className={loginFullWidthPrimaryClasses}
        type="button"
        onClick={onDone}
      >
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
    <div className="login-pane cookie-risk-page grid gap-4.5" role="tabpanel">
      <div className="cookie-risk-heading flex items-center gap-3.5 px-0.5 pt-0.5 pb-1">
        <ShieldWarning
          className="h-10.5 w-10.5 shrink-0 text-[var(--ors-color-warning)]"
          weight="fill"
        />
        <div>
          <span className="text-xs font-bold tracking-normal text-accent">
            高级登录方式
          </span>
          <h3 className={loginStatusHeadingClasses}>Cookie 登录的影响</h3>
        </div>
      </div>
      <div
        className="cookie-warning flex items-start gap-3 rounded-control bg-surface p-[15px] text-warning [border:1px_solid_var(--ors-color-warning)] dark:border-warning dark:bg-surface dark:text-warning"
        role="note"
      >
        <ShieldWarning
          className="mt-[1px] h-[21px] w-[21px] shrink-0"
          weight="fill"
        />
        <div>
          <strong className="text-sm">请先确认以下影响</strong>
          <p className={loginStatusCopyClasses}>
            此方式需要你自行获取 Cookie 和 User-Agent。
          </p>
          <p className={loginStatusCopyClasses}>
            登录后，原浏览器中的石之家登录状态会失效。
          </p>
        </div>
      </div>
      <label className="risk-checkbox risk-checkbox-panel box-border flex w-[max-content] cursor-pointer items-center gap-2.5 rounded-control border border-solid border-line bg-canvas px-[15px] py-3.5 text-sm font-bold focus-within:border-accent focus-within:shadow-[none]">
        <input
          className="m-0 h-[17px] w-[17px] [accent-color:var(--ors-color-accent)]"
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span>我已了解上述影响</span>
      </label>
      <button
        className={loginPrimaryButtonClasses}
        type="button"
        disabled={!accepted}
        onClick={onContinue}
      >
        继续使用 Cookie 登录
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
    <div className="login-pane grid gap-5" role="tabpanel">
      <div className="cookie-form-heading flex items-start justify-between gap-5">
        <div>
          <h3 className={loginStatusHeadingClasses}>粘贴已有 Cookie</h3>
          <p className="mx-0 mt-1.5 mb-0 text-[12px] leading-[1.5] text-muted">
            登录信息会加密保存在系统安全存储中。
          </p>
        </div>
        <button
          className="min-h-9 shrink-0 border-0 bg-transparent px-0 py-1 text-[12px] font-bold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:underline hover:[text-underline-offset:3px] pointer-coarse:min-h-11"
          type="button"
          onClick={onReviewRisk}
        >
          查看影响说明
        </button>
      </div>
      <div className="curl-import grid gap-2.5 rounded-control border border-solid border-line bg-hover p-3.5">
        <div className="curl-import-heading flex items-center gap-2.5">
          <ClipboardText
            className="h-6 w-6 shrink-0 text-accent"
            weight="duotone"
          />
          <div className="grid gap-0.5">
            <strong className="text-sm">从 Chrome 复制请求</strong>
            <span className="text-xs leading-[1.45] text-muted">
              在网络请求菜单中选择“复制为 cURL (bash)”
            </span>
          </div>
        </div>
        <textarea
          className={
            'curl-import-input box-border min-h-19 w-full resize-y rounded-control bg-canvas px-3 py-2.5 [font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] text-xs leading-[1.55] text-ink outline-none [border:1px_dashed_color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-control-line)_)] [transition:border-color_160ms_ease,_box-shadow_160ms_ease] placeholder:text-muted placeholder:opacity-78 focus:[border-style:solid] focus:border-accent focus:shadow-[none]'
          }
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
      <label className={loginFieldClasses}>
        User-Agent
        <input
          className={loginInputClasses}
          value={userAgent}
          onChange={(event) => onUserAgentChange(event.target.value)}
          placeholder="粘贴获取 Cookie 时浏览器的 User-Agent"
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <span className="login-field-hint text-xs leading-[1.55] font-medium text-muted">
          必须与 Cookie 来源浏览器一致，否则石之家会拒绝该会话。
        </span>
      </label>
      <label className={loginFieldClasses}>
        Cookie
        <textarea
          className={
            'box-border min-h-29.5 w-full resize-y rounded-control border border-solid border-control bg-canvas px-[13px] py-3 [font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] text-xs leading-[1.6] font-medium text-ink outline-none [font:inherit] [transition:border-color_160ms_ease,_box-shadow_160ms_ease] placeholder:text-muted placeholder:opacity-78 focus:border-accent focus:shadow-[none]'
          }
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
        className={loginPrimaryButtonClasses}
        type="button"
        disabled={busy || !cookie.trim() || !userAgent.trim()}
        onClick={() => void onLogin()}
      >
        {busy ? (
          <>
            <SpinnerGap className={loginSpinnerClasses} />
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
      className={clsx(
        "curl-import-message flex items-start gap-[7px] text-xs leading-[1.5]",
        successful
          ? "is-success text-accent"
          : "is-error text-danger dark:text-danger",
      )}
      role={successful ? "status" : "alert"}
    >
      {successful ? (
        <CheckCircle
          className="mt-[1px] h-[15px] w-[15px] shrink-0"
          weight="fill"
        />
      ) : (
        <WarningCircle
          className="mt-[1px] h-[15px] w-[15px] shrink-0"
          weight="fill"
        />
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
      tabIndex={method === current ? 0 : -1}
      aria-selected={current === method}
      className="relative flex min-h-12 items-center justify-center gap-[7px] border-0 bg-transparent px-2.5 py-0 text-sm font-bold text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] after:absolute after:right-[18%] after:bottom-[-1px] after:left-[18%] after:h-0.5 after:scale-x-0 after:bg-accent after:transition-transform after:duration-180 after:content-[''] aria-selected:text-ink aria-selected:after:scale-x-100 max-[700px]:min-h-12.5 max-[700px]:text-xs"
      onClick={() => void onSelect(method)}
    >
      {icon}
      <span>{METHOD_LABELS[method]}</span>
    </button>
  );
}
function BrowserSessionWarning() {
  return (
    <div
      className="session-warning flex items-start gap-[9px] rounded-control bg-surface px-[13px] py-[11px] text-[12px] leading-[1.55] text-warning dark:bg-surface dark:text-warning"
      role="note"
    >
      <ShieldWarning className="mt-[1px] h-[17px] w-[17px] shrink-0" />
      <span>使用此方式登录会使已登录的浏览器登录态失效。</span>
    </div>
  );
}
function ProgressMessage({
  progress,
  method,
  layout,
}: {
  progress: LoginProgress;
  method: "push" | "qr";
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "qr-stage";
}) {
  const text =
    progress === "scanned"
      ? "已扫描，请在手机上确认登录"
      : method === "push"
        ? "确认已发送，请在叨鱼中允许登录"
        : "等待扫描二维码";
  return (
    <div
      className={clsx(
        "login-progress flex min-h-11 items-center justify-center gap-[9px] rounded-control bg-selected text-sm font-bold text-accent",
        layout === "qr-stage" && "w-full",
      )}
      role="status"
    >
      <SpinnerGap className="spin h-4.5 w-4.5 animate-[login-spin_900ms_linear_infinite]" />
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
    <div
      className="login-success grid justify-items-center px-0 pt-2 pb-0.5 text-center"
      role="status"
    >
      <CheckCircle className="h-12 w-12 text-accent" weight="fill" />
      <span className="mt-3 text-[12px] font-bold text-accent">登录成功</span>
      <h3 className="mx-0 mt-2 mb-0.5 font-sans text-base text-[25px] font-semibold">
        {profile.characterName || profile.displayAccount}
      </h3>
      {location && (
        <p className="mx-0 mt-1 mb-0 text-[12px] text-muted">{location}</p>
      )}
      <div className="verified-label mx-0 my-5 flex items-center gap-[7px] rounded-control bg-hover px-[13px] py-2.5 text-xs text-muted">
        <UserCircleCheck className="h-4 w-4 text-accent" />
        已获取石之家账号与角色信息
      </div>
      <button
        className={loginFullWidthPrimaryClasses}
        type="button"
        onClick={onDone}
      >
        完成
      </button>
    </div>
  );
}
