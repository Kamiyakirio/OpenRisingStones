/** Shared loading state for lazy application entrypoints and workspaces. */

type LoadingPageProps = {
  message: string;
  fullscreen?: boolean;
  dark?: boolean;
};

export function LoadingPage({
  message,
  fullscreen = false,
  dark = false,
}: LoadingPageProps) {
  return (
    <div
      className={`[&&&&]:min-h-[100dvh] [&&&&]:p-[40px_24px] [&&&&]:[font-family:var(--ors-font-ui)] [@media(max-width:_899px)]:[.workspace-content_&&&&]:min-h-[calc(100dvh_-_59px)] [@media(max-width:_619px)]:[.workspace-content_&&&&]:min-h-[calc(100dvh_-_103px)] grid place-items-center text-ink loading-page${fullscreen ? ' [--ors-color-canvas:#fcfcfa] [--ors-color-surface:#ffffff] [--ors-color-hover:#eeeff3] [--ors-color-selected:#eef0f5] [--ors-color-text:#202127] [--ors-color-muted:#596170] [--ors-color-line:#c7cbd3] [--ors-color-control-line:#808896] [--ors-color-accent:#53618a] [--ors-color-accent-hover:#435074] [--ors-color-on-accent:#ffffff] [--ors-color-disabled:#687183] [--ors-color-success:#187552] [--ors-color-warning:#9b580c] [--ors-color-danger:#bf3548] [--ors-color-info:#4a6d91] [--ors-color-violet:#716184] [--ors-color-pink:#865e76] [--ors-color-teal:#466f73] [--ors-color-orange:#86684c] [--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.12)] [--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.2)] [color-scheme:light] [&.theme-dark]:[--ors-color-canvas:#0e0e10] [&.theme-dark]:[--ors-color-surface:#18191d] [&.theme-dark]:[--ors-color-hover:#26282f] [&.theme-dark]:[--ors-color-selected:#2a2d36] [&.theme-dark]:[--ors-color-text:#f2f3f5] [&.theme-dark]:[--ors-color-muted:#b0b6c3] [&.theme-dark]:[--ors-color-line:#383b43] [&.theme-dark]:[--ors-color-control-line:#778094] [&.theme-dark]:[--ors-color-accent:#a0aacb] [&.theme-dark]:[--ors-color-accent-hover:#b6bfd8] [&.theme-dark]:[--ors-color-on-accent:#101128] [&.theme-dark]:[--ors-color-disabled:#9aa2b2] [&.theme-dark]:[--ors-color-success:#70d4a4] [&.theme-dark]:[--ors-color-warning:#efba72] [&.theme-dark]:[--ors-color-danger:#ff94a5] [&.theme-dark]:[--ors-color-info:#9bafc8] [&.theme-dark]:[--ors-color-violet:#b2a3c5] [&.theme-dark]:[--ors-color-pink:#c2a0b2] [&.theme-dark]:[--ors-color-teal:#91b6b8] [&.theme-dark]:[--ors-color-orange:#c7ad90] [&.theme-dark]:[--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.4)] [&.theme-dark]:[--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.55)] [&.theme-dark]:[color-scheme:dark]  loading-page--fullscreen app [.loading-page--fullscreen&]:w-full [.loading-page--fullscreen&]:bg-canvas grid min-h-dvh grid-cols-[232px_minmax(0,1fr)] bg-canvas font-sans text-[15px] leading-relaxed text-ink [&_button:disabled]:cursor-not-allowed [&_input[type=checkbox]]:size-4 [&_input[type=radio]]:size-4 max-[899px]:block [.loading-page--fullscreen&&&&]:grid-cols-[minmax(0,_1fr)] [&&&&]:[--ink:var(--ors-color-text)] [&&&&]:[--muted:var(--ors-color-muted)] [&&&&]:[--paper:var(--ors-color-canvas)] [&&&&]:[--surface:var(--ors-color-surface)] [&&&&]:[--surface-2:var(--ors-color-hover)] [&&&&]:[--line:var(--ors-color-line)] [&&&&]:[--accent:var(--ors-color-accent)] [&&&&]:[--accent-strong:var(--ors-color-accent)] [&&&&]:[--accent-soft:var(--ors-color-selected)] [&&&&]:[--home-accent:var(--ors-color-accent)] [&&&&]:[--home-accent-strong:var(--ors-color-accent)] [&&&&]:[--danger:var(--ors-color-danger)] [&&&&]:[--danger-strong:var(--ors-color-danger)] [&&&&]:[--danger-soft:var(--ors-color-surface)] [&&&&]:[--danger-line:var(--ors-color-danger)] [&&&&]:[--shadow:var(--ors-shadow-popover)] [&&&&_button]:[transition:background-color_120ms,_color_120ms,_border-color_120ms] [&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[36px] [@media(pointer:_coarse)]:[&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[44px]' : ""}${dark ? " theme-dark" : ""}`}
      role="status"
    >
      <div
        className={
          "loading-page__content grid gap-[20px] text-center [&&&&]:[justify-items:center] [&&&&]:max-w-[100%]"
        }
      >
        <span
          className="loading-page__track block w-[128px] h-[2px] bg-line"
          aria-hidden="true"
        >
          <span
            className={
              "loading-page__indicator block w-[28px] h-[2px] bg-accent [&&&&]:animate-[loading-page-scan_1.6s_ease-in-out_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:transform-[translateX(50px)] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
            }
          />
        </span>
        <p
          className={
            "loading-page__message m-0 text-[15px] font-medium [&&&&]:leading-[1.6]"
          }
        >
          {message}
        </p>
      </div>
    </div>
  );
}
