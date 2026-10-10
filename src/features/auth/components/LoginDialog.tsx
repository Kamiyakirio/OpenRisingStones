/** Account login methods with explicit consent and bound-character verification. */
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

  const dialog = useDialogFocus(() => {
    void closeDialog();
  });

  return (
    <div
      className={
        "login-backdrop fixed grid place-items-center p-[16px] max-[700px]:p-0 [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)] [&&&&]:z-[30] [@media(max-width:_700px)]:[&&&&]:[align-items:end]"
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void closeDialog();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={
          "login-dialog rounded-2xl border border-control bg-surface text-ink max-[700px]:w-full max-[700px]:rounded-[var(--ors-radius-overlay)] [&&&&]:w-[min(640px,_100%)] [&&&&]:max-h-[calc(100dvh_-_32px)] [&&&&]:[overflow:auto] [@media(max-width:_700px)]:[&&&&]:max-h-[calc(100dvh_-_18px)]"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <header
          className={
            "login-dialog-header bg-tool-soft flex justify-between items-start p-[24px] [&_span]:text-accent [&_span]:text-xs [&_span]:font-bold [&_h2]:text-lg max-[700px]:[&_h2]:text-lg [&&&&_span]:[letter-spacing:normal] [&&&&_h2]:m-[6px_0_0] [&&&&_h2]:[font-family:var(--ors-font-ui)] [@media(max-width:_700px)]:[&&&&]:p-[22px_20px_17px]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold" id="login-title">
              登录盛趣通行证
            </h2>
          </div>
          <button
            ref={closeButton}
            className={
              "dialog-close grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink [&_svg]:size-5 [.settings-dialog-header_&&&&:disabled]:[cursor:wait] [.settings-dialog-header_&&&&:disabled]:opacity-[0.45]"
            }
            type="button"
            aria-label="关闭登录窗口"
            onClick={() => void closeDialog()}
          >
            <X />
          </button>
        </header>

        <div
          className={
            'login-methods grid border-b border-solid border-line [&_button]:relative [&_button]:flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[48px] [&_button]:border-0 [&_button]:text-muted [&_button]:text-sm [&_button]:font-bold [&_button::after]:absolute [&_button::after]:h-[2px] [&_button::after]:bg-accent [&_button::after]:text-on-accent [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:text-accent max-[700px]:[&_button]:min-h-[50px] [&&&&]:grid-cols-[repeat(3,_1fr)] [&&&&]:p-[0_28px] [&&&&_button]:p-[0_10px] [&&&&_button]:[background:transparent] [&&&&_button::after]:[content:""] [&&&&_button::after]:left-[18%] [&&&&_button::after]:right-[18%] [&&&&_button::after]:bottom-[-1px] [&&&&_button::after]:transform-[scaleX(0)] [&&&&_button::after]:[transition:transform_180ms_ease] [@media(max-width:_700px)]:[&&&&]:p-[0_12px] [@media(max-width:_700px)]:[&&&&_button]:text-[12px]'
          }
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

        <div
          className={
            "login-content p-[24px] [@media(max-width:_700px)]:[&&&&]:p-[22px_20px_26px]"
          }
        >
          {profile ? (
            <LoginSuccess profile={profile} onDone={() => void closeDialog()} />
          ) : bindingRequired ? (
            <CharacterBindingRequired onDone={() => void closeDialog()} />
          ) : method === "push" ? (
            <div className="login-pane grid gap-[20px]" role="tabpanel">
              <BrowserSessionWarning />
              <div
                className={
                  "login-intro flex items-center gap-[16px] [&_>_svg]:w-[48px] [&_>_svg]:h-[48px] [&_>_svg]:text-accent [&_p]:m-0 [&_p]:text-muted [&_p]:text-sm [&&&&]:p-[4px_2px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_h3]:m-[0_0_6px] [&&&&_h3]:text-[17px] [&&&&_p]:leading-[1.6]"
                }
              >
                <DeviceMobile weight="duotone" />
                <div>
                  <h3 className="text-base font-semibold">在叨鱼中确认登录</h3>
                  <p>输入绑定的手机号或盛趣账号，在叨鱼中确认。</p>
                </div>
              </div>
              <label
                className={
                  'login-field grid gap-[8px] text-ink font-bold [&_input]:w-full [&_input]:box-border [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:font-medium [&_textarea]:w-full [&_textarea]:box-border [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-control [&_textarea]:rounded-[var(--ors-radius-control)] [&_textarea]:text-ink [&_textarea]:bg-canvas [&_textarea]:font-medium [&_input]:min-h-[46px] [&_textarea]:min-h-[118px] [&_textarea]:text-xs [&_input:focus]:border-accent [&_textarea:focus]:border-accent [&_input::placeholder]:text-muted [&_textarea::placeholder]:text-muted [&&&&]:text-[12px] [&&&&_input]:[outline:0] [&&&&_input]:[font:inherit] [&&&&_input]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_textarea]:[outline:0] [&&&&_textarea]:[font:inherit] [&&&&_textarea]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_input]:p-[0_13px] [&&&&_textarea]:p-[12px_13px] [&&&&_textarea]:[resize:vertical] [&&&&_textarea]:[font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] [&&&&_textarea]:leading-[1.6] [&&&&_input:focus]:shadow-[none] [&&&&_textarea:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.78] [&&&&_textarea::placeholder]:opacity-[0.78]'
                }
              >
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
                  className={
                    "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
                  }
                  type="button"
                  disabled={busy || account.trim().length < 5}
                  onClick={() => void beginPush()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap
                        className={
                          "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                        }
                      />
                      正在发送
                    </>
                  ) : (
                    "发送一键登录确认"
                  )}
                </button>
              )}
            </div>
          ) : method === "qr" ? (
            <div className="login-pane grid gap-[20px]" role="tabpanel">
              <BrowserSessionWarning />
              {qrImage ? (
                <div
                  className={
                    "qr-stage grid gap-[17px] pt-[2px] [&&&&]:[justify-items:center]"
                  }
                >
                  <div
                    className={
                      "qr-frame grid place-items-center w-[190px] h-[190px] border border-solid border-line rounded-[var(--ors-radius-control)] [&_img]:w-[160px] [&_img]:h-[160px] [&&&&]:[background:#f7f8f5] [&&&&]:shadow-[none] [&&&&_img]:[image-rendering:pixelated]"
                    }
                  >
                    <img src={qrImage} alt="盛趣通行证登录二维码" />
                  </div>
                  <ProgressMessage
                    progress={progress ?? "awaiting_scan"}
                    method="qr"
                  />
                </div>
              ) : (
                <div
                  className={
                    "login-intro qr-intro flex items-center gap-[16px] [&_>_svg]:w-[48px] [&_>_svg]:h-[48px] [&_>_svg]:text-accent [&_p]:m-0 [&_p]:text-muted [&_p]:text-sm [&&&&]:p-[4px_2px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_h3]:m-[0_0_6px] [&&&&_h3]:text-[17px] [&&&&_p]:leading-[1.6]"
                  }
                >
                  <QrCode weight="duotone" />
                  <div>
                    <h3 className="text-base font-semibold">
                      使用叨鱼扫描二维码
                    </h3>
                    <p>二维码仅用于本次登录，生成后请在 2 分钟内完成确认。</p>
                  </div>
                </div>
              )}
              {!activeLogin && !qrImage && (
                <button
                  className={
                    "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
                  }
                  type="button"
                  disabled={busy}
                  onClick={() => void beginQr()}
                >
                  {busy ? (
                    <>
                      <SpinnerGap
                        className={
                          "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                        }
                      />
                      正在生成
                    </>
                  ) : (
                    "生成登录二维码"
                  )}
                </button>
              )}
              {!activeLogin && qrImage && progress !== "success" && (
                <button
                  className={
                    "login-secondary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-line text-ink [&:hover]:border-accent [&:hover]:bg-selected [&_svg]:w-[17px] [&_svg]:h-[17px] [&&&&]:p-[0_18px] [&&&&]:[background:transparent]"
                  }
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
              className={
                "login-error mt-[18px] rounded-[var(--ors-radius-control)] text-danger bg-surface [.theme-dark_&]:text-danger [.theme-dark_&]:bg-surface [&&&&]:p-[12px_14px] [&&&&]:[border-left:1px_solid_var(--ors-color-danger)] [&&&&]:text-[12px] [&&&&]:leading-[1.55]"
              }
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
      className={
        "login-pane binding-required grid gap-[20px] text-center [&_>_svg]:w-[52px] [&_>_svg]:h-[52px] [&_>_svg]:text-accent [&_>_span]:text-accent [&_>_span]:font-bold [&&&&]:[justify-items:center] [&&&&]:p-[6px_0_2px] [&&&&_>_span]:text-[12px] [&&&&_h3]:m-[-8px_0_0] [&&&&_h3]:[font-family:var(--ors-font-ui)] [&&&&_h3]:text-[23px]"
      }
      role="status"
    >
      <IdentificationCard weight="duotone" />
      <span>尚未绑定角色</span>
      <h3 className="text-base font-semibold">请先在石之家官网绑定角色</h3>
      <div
        className={
          "binding-required-copy w-full box-border rounded-[var(--ors-radius-control)] text-muted bg-hover text-left [&_p]:m-0 [&_p_+_p]:mt-[6px] [&&&&]:p-[14px_16px] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.65]"
        }
      >
        <p>当前盛趣账号已经通过验证，但石之家没有返回可用角色。</p>
        <p>请在官网完成角色绑定后，再回到 App 重新登录。</p>
      </div>
      <button
        className={
          "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
        }
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
    <div
      className="login-pane cookie-risk-page grid gap-[18px]"
      role="tabpanel"
    >
      <div
        className={
          "cookie-risk-heading flex items-center gap-[14px] [&_>_svg]:w-[42px] [&_>_svg]:h-[42px] [&_span]:text-accent [&_span]:text-xs [&_span]:font-bold [&&&&]:p-[2px_2px_4px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_>_svg]:[color:var(--ors-color-warning)] [&&&&_span]:[letter-spacing:normal] [&&&&_h3]:m-[4px_0_0] [&&&&_h3]:text-[18px]"
        }
      >
        <ShieldWarning weight="fill" />
        <div>
          <span>高级登录方式</span>
          <h3 className="text-base font-semibold">Cookie 登录的影响</h3>
        </div>
      </div>
      <div
        className={
          "cookie-warning flex items-start gap-[12px] p-[15px] rounded-[var(--ors-radius-control)] text-warning bg-surface [.theme-dark_&]:border-warning [.theme-dark_&]:text-warning [.theme-dark_&]:bg-surface [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_>_svg]:mt-[1px] [&_strong]:text-sm [&&&&]:[border:1px_solid_var(--ors-color-warning)] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_p]:m-[6px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.55]"
        }
        role="note"
      >
        <ShieldWarning weight="fill" />
        <div>
          <strong>请先确认以下影响</strong>
          <p>此方式需要你自行获取 Cookie 和 User-Agent。</p>
          <p>登录后，原浏览器中的石之家登录状态会失效。</p>
        </div>
      </div>
      <label
        className={
          "risk-checkbox risk-checkbox-panel flex items-center gap-[10px] text-sm font-bold cursor-pointer [&_input]:w-[17px] [&_input]:h-[17px] [&_input]:m-0 w-full box-border border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&:focus-within]:border-accent [&&&&]:w-[max-content] [&&&&_input]:[accent-color:var(--ors-color-accent)] [&&&&]:p-[14px_15px] [&&&&:focus-within]:shadow-[none]"
        }
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span>我已了解上述影响</span>
      </label>
      <button
        className={
          "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
        }
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
    <div className="login-pane grid gap-[20px]" role="tabpanel">
      <div
        className={
          "cookie-form-heading flex justify-between items-start gap-[20px] [&_h3]:mt-0 [&_p]:text-muted [&_button]:border-0 [&_button]:text-accent [&_button]:font-bold [&&&&_h3]:m-[4px_0_0] [&&&&_h3]:text-[18px] [&&&&_p]:m-[6px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.5] [&&&&_button]:flex-[0_0_auto] [&&&&_button]:p-[4px_0] [&&&&_button]:[background:transparent] [&&&&_button]:text-[12px] [&&&&_button:hover]:[text-decoration:underline] [&&&&_button:hover]:[text-underline-offset:3px]"
        }
      >
        <div>
          <h3 className="text-base font-semibold">粘贴已有 Cookie</h3>
          <p>登录信息会加密保存在系统安全存储中。</p>
        </div>
        <button type="button" onClick={onReviewRisk}>
          查看影响说明
        </button>
      </div>
      <div className="curl-import grid gap-[10px] p-[14px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-hover">
        <div
          className={
            "curl-import-heading flex items-center gap-[10px] [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_>_svg]:text-accent [&_>_div]:grid [&_>_div]:gap-[2px] [&_strong]:text-sm [&_span]:text-muted [&_span]:text-xs [&&&&_>_svg]:flex-[0_0_auto] [&&&&_span]:leading-[1.45]"
          }
        >
          <ClipboardText weight="duotone" />
          <div>
            <strong>从 Chrome 复制请求</strong>
            <span>在网络请求菜单中选择“复制为 cURL (bash)”</span>
          </div>
        </div>
        <textarea
          className={
            'curl-import-input w-full min-h-[76px] box-border rounded-[var(--ors-radius-control)] text-ink bg-canvas text-xs [&:focus]:border-accent [&::placeholder]:text-muted [&&&&]:p-[10px_12px] [&&&&]:[resize:vertical] [&&&&]:[border:1px_dashed_color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-control-line)_)] [&&&&]:[outline:0] [&&&&]:[font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] [&&&&]:leading-[1.55] [&&&&]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&:focus]:[border-style:solid] [&&&&:focus]:shadow-[none] [&&&&::placeholder]:opacity-[0.78]'
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
      <label
        className={
          'login-field grid gap-[8px] text-ink font-bold [&_input]:w-full [&_input]:box-border [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:font-medium [&_textarea]:w-full [&_textarea]:box-border [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-control [&_textarea]:rounded-[var(--ors-radius-control)] [&_textarea]:text-ink [&_textarea]:bg-canvas [&_textarea]:font-medium [&_input]:min-h-[46px] [&_textarea]:min-h-[118px] [&_textarea]:text-xs [&_input:focus]:border-accent [&_textarea:focus]:border-accent [&_input::placeholder]:text-muted [&_textarea::placeholder]:text-muted [&&&&]:text-[12px] [&&&&_input]:[outline:0] [&&&&_input]:[font:inherit] [&&&&_input]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_textarea]:[outline:0] [&&&&_textarea]:[font:inherit] [&&&&_textarea]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_input]:p-[0_13px] [&&&&_textarea]:p-[12px_13px] [&&&&_textarea]:[resize:vertical] [&&&&_textarea]:[font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] [&&&&_textarea]:leading-[1.6] [&&&&_input:focus]:shadow-[none] [&&&&_textarea:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.78] [&&&&_textarea::placeholder]:opacity-[0.78]'
        }
      >
        User-Agent
        <input
          value={userAgent}
          onChange={(event) => onUserAgentChange(event.target.value)}
          placeholder="粘贴获取 Cookie 时浏览器的 User-Agent"
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <span
          className={
            "login-field-hint text-muted text-xs font-medium [&&&&]:leading-[1.55]"
          }
        >
          必须与 Cookie 来源浏览器一致，否则石之家会拒绝该会话。
        </span>
      </label>
      <label
        className={
          'login-field grid gap-[8px] text-ink font-bold [&_input]:w-full [&_input]:box-border [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:font-medium [&_textarea]:w-full [&_textarea]:box-border [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-control [&_textarea]:rounded-[var(--ors-radius-control)] [&_textarea]:text-ink [&_textarea]:bg-canvas [&_textarea]:font-medium [&_input]:min-h-[46px] [&_textarea]:min-h-[118px] [&_textarea]:text-xs [&_input:focus]:border-accent [&_textarea:focus]:border-accent [&_input::placeholder]:text-muted [&_textarea::placeholder]:text-muted [&&&&]:text-[12px] [&&&&_input]:[outline:0] [&&&&_input]:[font:inherit] [&&&&_input]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_textarea]:[outline:0] [&&&&_textarea]:[font:inherit] [&&&&_textarea]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_input]:p-[0_13px] [&&&&_textarea]:p-[12px_13px] [&&&&_textarea]:[resize:vertical] [&&&&_textarea]:[font-family:"Cascadia_Mono",_"SFMono-Regular",_Consolas,_monospace] [&&&&_textarea]:leading-[1.6] [&&&&_input:focus]:shadow-[none] [&&&&_textarea:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.78] [&&&&_textarea::placeholder]:opacity-[0.78]'
        }
      >
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
        className={
          "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
        }
        type="button"
        disabled={busy || !cookie.trim() || !userAgent.trim()}
        onClick={() => void onLogin()}
      >
        {busy ? (
          <>
            <SpinnerGap
              className={
                "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
              }
            />
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
      className={`[&&&&]:leading-[1.5] [&&&&_svg]:flex-[0_0_auto] flex items-start gap-[7px] text-xs [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:mt-[1px] curl-import-message ${successful ? "is-success [.curl-import-message&]:text-accent" : "is-error [.curl-import-message&]:text-danger [.theme-dark_.curl-import-message&]:text-danger [.teleport-alert&]:border-danger [.teleport-alert&]:text-danger [.teleport-alert&]:bg-surface [&&&&]:[color:var(--ors-color-danger)]!"}`}
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
      tabIndex={method === current ? 0 : -1}
      aria-selected={current === method}
      className={
        current === method
          ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
          : ""
      }
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
      className={
        "session-warning flex items-start gap-[9px] rounded-[var(--ors-radius-control)] text-warning bg-surface [.theme-dark_&]:text-warning [.theme-dark_&]:bg-surface [&_svg]:w-[17px] [&_svg]:h-[17px] [&_svg]:mt-[1px] [&&&&]:p-[11px_13px] [&&&&]:text-[12px] [&&&&]:leading-[1.55] [&&&&_svg]:flex-[0_0_auto]"
      }
      role="note"
    >
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
    <div
      className="login-progress flex justify-center items-center gap-[9px] min-h-[44px] rounded-[var(--ors-radius-control)] text-accent bg-selected text-sm font-bold [&_svg]:w-[18px] [&_svg]:h-[18px] [.qr-stage_&]:w-full"
      role="status"
    >
      <SpinnerGap
        className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
      />
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
      className={
        "login-success grid text-center [&_>_svg]:w-[48px] [&_>_svg]:h-[48px] [&_>_svg]:text-accent [&_>_span]:mt-[12px] [&_>_span]:text-accent [&_>_span]:font-bold [&_p]:text-muted [&&&&]:[justify-items:center] [&&&&]:p-[8px_0_2px] [&&&&_>_span]:text-[12px] [&&&&_h3]:m-[8px_0_2px] [&&&&_h3]:[font-family:var(--ors-font-ui)] [&&&&_h3]:text-[25px] [&&&&_p]:m-[4px_0_0] [&&&&_p]:text-[12px]"
      }
      role="status"
    >
      <CheckCircle weight="fill" />
      <span>登录成功</span>
      <h3 className="text-base font-semibold">
        {profile.characterName || profile.displayAccount}
      </h3>
      {location && <p>{location}</p>}
      <div
        className={
          "verified-label flex items-center gap-[7px] rounded-[var(--ors-radius-control)] text-muted bg-hover text-xs [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:text-accent [&&&&]:m-[20px_0] [&&&&]:p-[10px_13px]"
        }
      >
        <UserCircleCheck />
        已获取石之家账号与角色信息
      </div>
      <button
        className={
          "login-primary inline-flex justify-center items-center gap-[8px] min-h-[46px] rounded-[var(--ors-radius-control)] text-sm font-bold border border-solid border-accent text-on-accent bg-accent [.theme-dark_&]:text-on-accent [&:disabled]:cursor-not-allowed [&_svg]:w-[17px] [&_svg]:h-[17px] [.binding-required_&]:w-full [.login-success_&]:w-full [&&&&]:p-[0_18px] [&&&&:disabled]:opacity-[0.46]"
        }
        type="button"
        onClick={onDone}
      >
        完成
      </button>
    </div>
  );
}
