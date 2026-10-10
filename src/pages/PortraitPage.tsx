/** External control surface for the game's native portrait lighting editor. */
import {
  Aperture,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  FilmStrip,
  LightbulbFilament,
  MoonStars,
  Pause,
  Play,
  PlugsConnected,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RiskDialog } from "../shared/components/RiskDialog";
import { usePortraitLighting } from "../features/portrait/hooks/usePortraitLighting";
import {
  PORTRAIT_ANIMATION_FIELDS,
  PORTRAIT_LIGHTING_FIELDS,
  type PortraitLighting,
} from "../features/portrait/types";

export function PortraitPage() {
  const editor = usePortraitLighting();
  const lighting = editor.lighting;
  const connected = editor.phase === "ready";
  const editable = Boolean(
    lighting?.editorOpen && lighting.characterReady && !editor.updateFailed,
  );

  return (
    <main
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 portrait-page min-h-[calc(100dvh-56px)] [@media(prefers-reduced-motion:_reduce)]:[&&&&_*]:[scroll-behavior:auto]"
      }
    >
      <header
        className={
          "portrait-header flex gap-[var(--ors-space-8)] items-start justify-between pb-[var(--ors-space-6)] border-b border-solid border-line [&_h1]:m-0 [&_p]:text-muted max-[700px]:items-stretch max-[700px]:flex-col [&&&&_p]:max-w-[65ch] [&&&&_p]:m-[var(--ors-space-2)_0_0]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">肖像助手</h1>
          <p>调整动作时间和光照。</p>
        </div>
        <div
          className={
            "portrait-header-actions flex items-center gap-[var(--ors-space-3)] max-[700px]:items-stretch max-[700px]:justify-between max-[480px]:flex-col [&&&&]:flex-[0_0_auto]"
          }
        >
          <PortraitStatus phase={editor.phase} lighting={lighting} />
          {connected && (
            <button
              className={
                "portrait-secondary-button flex items-center gap-[var(--ors-space-2)] justify-center min-h-[40px] rounded-[var(--ors-radius-control)] font-semibold text-ink bg-surface border border-solid border-control [&:hover:not(:disabled)]:bg-hover [&_svg]:w-[18px] [&_svg]:h-[18px] max-[480px]:w-full [&&&&]:p-[8px_14px]"
              }
              type="button"
              disabled={editor.updating}
              onClick={() => void editor.refresh()}
            >
              <ArrowClockwise aria-hidden="true" />
              重新读取
            </button>
          )}
        </div>
      </header>

      {editor.error && <PortraitError code={editor.error.code} />}

      {!connected ? (
        <PortraitIntroduction
          phase={editor.phase}
          onConnect={editor.requestConnect}
        />
      ) : !lighting?.editorOpen ? (
        <PortraitEditorNotice
          title="打开游戏中的肖像编辑"
          description="打开套装肖像或冒险者铭牌后，将自动读取光照。"
        />
      ) : !lighting.characterReady ? (
        <PortraitEditorNotice
          title="正在载入肖像"
          description="请稍候。"
          loading
        />
      ) : (
        <PortraitLightingConsole
          lighting={lighting}
          initial={editor.initialLighting}
          animationSupported={editor.animationSupported}
          editable={editable}
          updating={editor.updating}
          updateFailed={editor.updateFailed}
          onChange={editor.changeLighting}
          onAnimationChange={editor.changeAnimation}
        />
      )}

      {editor.riskOpen && (
        <RiskDialog
          title="连接肖像助手前请确认风险"
          items={[
            "会向 FF14 游戏进程注入模块，读取并修改当前肖像的动作和光照。",
            "使用第三方程序可能违反用户协议，并导致账号处罚。",
            "只修改当前编辑器的动作时间和光照参数。",
            "肖像仍需在游戏中保存。",
          ]}
          description={<p>不接受以上风险，请取消。</p>}
          confirmLabel="理解风险并连接"
          storageError={editor.storageError}
          onConfirm={editor.confirmRisk}
          onCancel={editor.cancelRisk}
        />
      )}
    </main>
  );
}

function PortraitIntroduction({
  phase,
  onConnect,
}: {
  phase: "idle" | "connecting" | "ready" | "unsupported";
  onConnect: () => void;
}) {
  const connecting = phase === "connecting";
  return (
    <section
      className={
        "portrait-introduction [&_h2]:m-0 mt-7 grid max-w-[960px] grid-cols-[48px_minmax(0,1fr)] gap-5 rounded-xl border border-line bg-surface p-6 [&_>_svg]:w-[44px] [&_>_svg]:h-[44px] [&_>_svg]:text-accent [&_p]:text-muted max-[480px]:[&_>_svg]:w-[32px] max-[480px]:[&_>_svg]:h-[32px] [&&&&_p]:m-[var(--ors-space-1)_0_0] [@media(max-width:_480px)]:[&&&&]:grid-cols-[36px_minmax(0,_1fr)]"
      }
    >
      <Aperture aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold">连接游戏</h2>
        <p>先在游戏中打开肖像编辑，再连接。</p>
      </div>
      <button
        className={
          "portrait-connect-button flex items-center gap-[var(--ors-space-2)] justify-center min-h-[40px] rounded-[var(--ors-radius-control)] font-semibold text-on-accent bg-accent border border-solid border-accent [&:hover:not(:disabled)]:bg-accent-hover [&_svg]:w-[18px] [&_svg]:h-[18px] [&&&&]:p-[8px_14px] [&&&&]:[grid-column:2] [&&&&]:[justify-self:start] [@media(max-width:_480px)]:[&&&&]:[grid-column:1_/_3] [@media(max-width:_480px)]:[&&&&]:[justify-self:stretch]"
        }
        type="button"
        disabled={connecting || phase === "unsupported"}
        onClick={onConnect}
      >
        {connecting ? (
          <SpinnerGap
            className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
            aria-hidden="true"
          />
        ) : (
          <PlugsConnected aria-hidden="true" />
        )}
        {connecting ? "正在连接" : "连接游戏"}
      </button>
    </section>
  );
}

function PortraitLightingConsole({
  lighting,
  initial,
  animationSupported,
  editable,
  updating,
  updateFailed,
  onChange,
  onAnimationChange,
}: {
  lighting: PortraitLighting;
  initial: PortraitLighting | null;
  animationSupported: boolean;
  editable: boolean;
  updating: boolean;
  updateFailed: boolean;
  onChange: (
    fields: number,
    change: (current: PortraitLighting) => PortraitLighting,
  ) => void;
  onAnimationChange: (fields: number, time: number, paused: boolean) => void;
}) {
  const resetAll = () => {
    if (!initial) return;
    onChange(PORTRAIT_LIGHTING_FIELDS.all, (current) => ({
      ...current,
      ambientColor: initial.ambientColor,
      ambientBrightness: initial.ambientBrightness,
      directionalColor: initial.directionalColor,
      directionalBrightness: initial.directionalBrightness,
      directionalVerticalAngle: initial.directionalVerticalAngle,
      directionalHorizontalAngle: initial.directionalHorizontalAngle,
    }));
  };

  return (
    <div className="portrait-workspace mt-[var(--ors-space-6)]">
      <div
        className={
          "portrait-workspace-bar flex items-center min-h-16 flex-wrap gap-5 rounded-xl border border-line bg-surface px-4 py-3 [&_>_div:first-child]:grid [&_>_div:first-child]:gap-[2px] [&_>_div:first-child]:min-w-0 [&_span]:text-muted [&_span]:text-[13px] max-[700px]:items-stretch max-[700px]:flex-col [&&&&_>_div:first-child]:[margin-right:auto]"
        }
      >
        <div>
          <strong>{portraitOpenType(lighting.openType)}</strong>
          <span>{lighting.hasChanges ? "游戏中有未保存的修改" : "已同步"}</span>
        </div>
        {(updating || updateFailed) && (
          <div
            className="portrait-sync-state flex items-center text-muted text-[13px] gap-[var(--ors-space-2)] whitespace-nowrap"
            aria-live="polite"
          >
            {updating && (
              <SpinnerGap
                className={
                  "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                }
                aria-hidden="true"
              />
            )}
            {updating ? "正在写入" : "写入失败"}
          </div>
        )}
        <button
          className={
            "portrait-secondary-button flex items-center gap-[var(--ors-space-2)] justify-center min-h-[40px] rounded-[var(--ors-radius-control)] font-semibold text-ink bg-surface border border-solid border-control [&:hover:not(:disabled)]:bg-hover [&_svg]:w-[18px] [&_svg]:h-[18px] max-[480px]:w-full [&&&&]:p-[8px_14px]"
          }
          type="button"
          disabled={!initial || !editable}
          onClick={resetAll}
        >
          重置全部光照
        </button>
      </div>

      <AnimationTimeline
        lighting={lighting}
        supported={animationSupported}
        disabled={!editable}
        onChange={onAnimationChange}
      />

      <div
        className={
          "portrait-lighting-console grid gap-[var(--ors-space-6)] mt-[var(--ors-space-6)] [&&&&]:grid-cols-[minmax(0,_0.84fr)_minmax(0,_1.16fr)] [@media(max-width:_1050px)]:[&&&&]:grid-cols-[1fr]"
        }
      >
        <LightingPanel
          className="portrait-ambient-panel"
          icon={<MoonStars aria-hidden="true" />}
          title="环境光"
          description="调整人物整体明暗。"
          color={lighting.ambientColor}
          brightness={lighting.ambientBrightness}
          disabled={!editable}
          onColor={(color) =>
            onChange(PORTRAIT_LIGHTING_FIELDS.ambientColor, (current) => ({
              ...current,
              ambientColor: color,
            }))
          }
          onBrightness={(value) =>
            onChange(PORTRAIT_LIGHTING_FIELDS.ambientBrightness, (current) => ({
              ...current,
              ambientBrightness: value,
            }))
          }
          onReset={() => {
            if (!initial) return;
            onChange(
              PORTRAIT_LIGHTING_FIELDS.ambientColor |
                PORTRAIT_LIGHTING_FIELDS.ambientBrightness,
              (current) => ({
                ...current,
                ambientColor: initial.ambientColor,
                ambientBrightness: initial.ambientBrightness,
              }),
            );
          }}
        />

        <LightingPanel
          className="portrait-directional-panel"
          icon={<LightbulbFilament aria-hidden="true" />}
          title="方向光"
          description="调整主光颜色、亮度和角度。"
          color={lighting.directionalColor}
          brightness={lighting.directionalBrightness}
          disabled={!editable}
          onColor={(color) =>
            onChange(PORTRAIT_LIGHTING_FIELDS.directionalColor, (current) => ({
              ...current,
              directionalColor: color,
            }))
          }
          onBrightness={(value) =>
            onChange(
              PORTRAIT_LIGHTING_FIELDS.directionalBrightness,
              (current) => ({ ...current, directionalBrightness: value }),
            )
          }
          onReset={() => {
            if (!initial) return;
            onChange(
              PORTRAIT_LIGHTING_FIELDS.directionalColor |
                PORTRAIT_LIGHTING_FIELDS.directionalBrightness |
                PORTRAIT_LIGHTING_FIELDS.directionalAngles,
              (current) => ({
                ...current,
                directionalColor: initial.directionalColor,
                directionalBrightness: initial.directionalBrightness,
                directionalVerticalAngle: initial.directionalVerticalAngle,
                directionalHorizontalAngle: initial.directionalHorizontalAngle,
              }),
            );
          }}
        >
          <DirectionControl
            color={lighting.directionalColor}
            horizontal={lighting.directionalHorizontalAngle}
            vertical={lighting.directionalVerticalAngle}
            disabled={!editable}
            onChange={(horizontal, vertical) =>
              onChange(
                PORTRAIT_LIGHTING_FIELDS.directionalAngles,
                (current) => ({
                  ...current,
                  directionalHorizontalAngle: horizontal,
                  directionalVerticalAngle: vertical,
                }),
              )
            }
          />
        </LightingPanel>
      </div>

      <p
        className={
          "portrait-save-note text-muted text-[13px] [&&&&]:max-w-[70ch] [&&&&]:m-[var(--ors-space-5)_0_0]"
        }
      >
        {updateFailed
          ? "写入失败，已恢复游戏中的值。重新读取后再试。"
          : "修改后请在游戏中保存。"}
      </p>
    </div>
  );
}

function AnimationTimeline({
  lighting,
  supported,
  disabled,
  onChange,
}: {
  lighting: PortraitLighting;
  supported: boolean;
  disabled: boolean;
  onChange: (fields: number, time: number, paused: boolean) => void;
}) {
  const totalFrames = lighting.animationFrameCount;
  const currentFrame = Math.min(
    totalFrames,
    Math.max(0, Math.round(lighting.animationTime * 30)),
  );
  const unavailable = !lighting.animationAvailable || totalFrames === 0;
  const controlDisabled =
    disabled || unavailable || !lighting.animationEditable;
  const seek = (frame: number) => {
    const nextFrame = Math.min(totalFrames, Math.max(0, frame));
    onChange(
      PORTRAIT_ANIMATION_FIELDS.time | PORTRAIT_ANIMATION_FIELDS.paused,
      nextFrame / 30,
      true,
    );
  };

  return (
    <section
      className={
        "portrait-animation-panel [&_h2]:m-0 mt-[var(--ors-space-6)] bg-surface border border-solid border-line rounded-[var(--ors-radius-panel)] [&_>_header]:grid [&_>_header]:gap-[var(--ors-space-3)] [&_>_header]:items-center [&_header_p]:text-muted [&_header_p]:text-[13px] [&_header_p]:tabular-nums [@media(max-width:_700px)]:[&&&&]:p-[var(--ors-space-4)] [&&&&]:p-[var(--ors-space-4)_var(--ors-space-5)] [&&&&_>_header]:grid-cols-[36px_minmax(0,_1fr)_auto] [&&&&_header_p]:m-[var(--ors-space-1)_0_0] [@media(max-width:_480px)]:[&&&&_>_header]:grid-cols-[36px_minmax(0,_1fr)]"
      }
    >
      <header>
        <span className="portrait-light-icon grid place-items-center w-[36px] h-[36px] text-accent bg-selected rounded-[var(--ors-radius-control)] [&_svg]:w-[21px] [&_svg]:h-[21px]">
          <FilmStrip aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">动作时间轴</h2>
          <p>
            {!supported
              ? "当前载荷不支持动作时间轴，请更新载荷后重连。"
              : unavailable
                ? "当前动作没有可调时间轴。"
                : !lighting.animationEditable
                  ? "当前版本只能读取动作时间。"
                  : `第 ${currentFrame} 帧，共 ${totalFrames} 帧`}
          </p>
        </div>
        <button
          className={
            "portrait-play-button inline-flex items-center justify-center text-ink bg-canvas border border-solid border-control rounded-[var(--ors-radius-control)] gap-[var(--ors-space-2)] min-w-[88px] min-h-[38px] font-semibold [&:hover:not(:disabled)]:bg-hover [&_svg]:w-[18px] [&_svg]:h-[18px] max-[480px]:w-full [&&&&]:p-[7px_12px] [@media(max-width:_480px)]:[&&&&]:[grid-column:1_/_3]"
          }
          type="button"
          disabled={controlDisabled}
          onClick={() =>
            onChange(
              PORTRAIT_ANIMATION_FIELDS.paused,
              lighting.animationTime,
              !lighting.animationPaused,
            )
          }
        >
          {lighting.animationPaused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
          {lighting.animationPaused ? "播放" : "暂停"}
        </button>
      </header>
      <div
        className={
          'portrait-timeline-controls [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:text-ink [&_button]:bg-canvas [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button:hover:not(:disabled)]:bg-hover [&_button_svg]:w-[18px] [&_button_svg]:h-[18px] grid gap-[var(--ors-space-3)] items-center mt-[var(--ors-space-4)] pt-[var(--ors-space-4)] border-t border-solid border-line [&_button]:w-[36px] [&_button]:h-[36px] [&_button]:p-0 [&_input[type=range]]:w-full [&&&&]:grid-cols-[36px_minmax(0,_1fr)_36px_88px_auto] [&&&&_input[type="range"]]:[accent-color:var(--ors-color-accent)] [@media(max-width:_480px)]:[&&&&]:grid-cols-[36px_minmax(0,_1fr)_36px_88px] [@media(max-width:_390px)]:[&&&&]:grid-cols-[36px_minmax(0,_1fr)_36px] [@media(pointer:_coarse)]:[&&&&_button]:size-11 [@media(pointer:_coarse)]:[&&&&]:grid-cols-[44px_minmax(0,_1fr)_44px_88px_auto] [@media(pointer:_coarse)_and_(max-width:_480px)]:[&&&&]:grid-cols-[44px_minmax(0,_1fr)_44px_88px] [@media(pointer:_coarse)_and_(max-width:_390px)]:[&&&&]:grid-cols-[44px_minmax(0,_1fr)_44px]'
        }
      >
        <button
          type="button"
          aria-label="上一帧"
          disabled={controlDisabled || currentFrame === 0}
          onClick={() => seek(currentFrame - 1)}
        >
          <CaretLeft aria-hidden="true" />
        </button>
        <input
          aria-label="动作帧"
          type="range"
          min={0}
          max={Math.max(1, totalFrames)}
          step={1}
          value={currentFrame}
          disabled={controlDisabled}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <button
          type="button"
          aria-label="下一帧"
          disabled={controlDisabled || currentFrame === totalFrames}
          onClick={() => seek(currentFrame + 1)}
        >
          <CaretRight aria-hidden="true" />
        </button>
        <NumericInput
          ariaLabel="当前动作帧"
          value={currentFrame}
          min={0}
          max={totalFrames}
          disabled={controlDisabled}
          commitAlways
          onChange={seek}
        />
        <span
          className={
            "portrait-timeline-duration text-muted text-[13px] tabular-nums whitespace-nowrap max-[480px]:text-right [@media(max-width:_480px)]:[&&&&]:[grid-column:1_/_5] [@media(max-width:_390px)]:[&&&&]:[grid-column:1_/_4]"
          }
        >
          / {formatAnimationTime(lighting.animationDuration)}
        </span>
      </div>
    </section>
  );
}

function LightingPanel({
  className,
  icon,
  title,
  description,
  color,
  brightness,
  disabled,
  onColor,
  onBrightness,
  onReset,
  children,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  description: string;
  color: [number, number, number];
  brightness: number;
  disabled: boolean;
  onColor: (value: [number, number, number]) => void;
  onBrightness: (value: number) => void;
  onReset: () => void;
  children?: ReactNode;
}) {
  const hex = colorToHex(color);
  return (
    <section
      className={`[&&&&_header_p]:m-[var(--ors-space-1)_0_0] [&&&&]:[align-self:start] [&&&&_>_header]:grid-cols-[36px_minmax(0,_1fr)_auto] [&&&&_>_header]:[align-items:start] [&&&&_header_p]:max-w-[48ch] [&&&&_header_button]:p-[6px_10px] [&&&&_header_button]:[background:transparent] [&_h2]:m-0 [&_header_p]:text-muted min-w-0 p-[var(--ors-space-5)] bg-surface border border-solid border-line rounded-[var(--ors-radius-panel)] [&_>_header]:grid [&_>_header]:gap-[var(--ors-space-3)] [&_>_header]:pb-[var(--ors-space-5)] [&_>_header]:border-b [&_>_header]:border-solid [&_>_header]:border-line [&_header_p]:text-[13px] [&_header_button]:min-h-[36px] [&_header_button]:text-accent [&_header_button]:border [&_header_button]:border-solid [&_header_button]:border-line [&_header_button]:rounded-[var(--ors-radius-control)] [&_header_button:hover:not(:disabled)]:bg-hover max-[700px]:p-[var(--ors-space-4)] portrait-light-panel ${className}`}
    >
      <header>
        <span className="portrait-light-icon grid place-items-center w-[36px] h-[36px] text-accent bg-selected rounded-[var(--ors-radius-control)] [&_svg]:w-[21px] [&_svg]:h-[21px]">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" disabled={disabled} onClick={onReset}>
          重置
        </button>
      </header>
      <ColorControl
        id={`${className}-color`}
        color={color}
        hex={hex}
        disabled={disabled}
        onChange={onColor}
      />
      <RangeControl
        id={`${className}-brightness`}
        label="亮度"
        min={0}
        max={255}
        value={brightness}
        disabled={disabled}
        onChange={onBrightness}
      />
      {children}
    </section>
  );
}

function DirectionControl({
  color,
  horizontal,
  vertical,
  disabled,
  onChange,
}: {
  color: [number, number, number];
  horizontal: number;
  vertical: number;
  disabled: boolean;
  onChange: (horizontal: number, vertical: number) => void;
}) {
  const style = {
    "--portrait-light-angle": `${horizontal}deg`,
    "--portrait-light-height": `${Math.round((-vertical / 180) * 34)}px`,
    "--portrait-light-color": `rgb(${color.join(" ")})`,
  } as CSSProperties;
  return (
    <div
      className={
        "portrait-direction-control grid gap-[var(--ors-space-6)] items-center mt-[var(--ors-space-6)] pt-[var(--ors-space-5)] border-t border-solid border-line [&&&&]:grid-cols-[176px_minmax(0,_1fr)] [@media(max-width:_1050px)]:[&&&&]:grid-cols-[168px_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr]"
      }
    >
      <div
        className={
          'portrait-direction-dial relative w-[168px] border border-solid border-control [&::before]:absolute [&::before]:border [&::before]:border-solid [&::before]:border-line [&_b]:absolute [&_b]:text-muted [&_b]:bg-surface [&_b]:text-xs [&_b]:font-medium [&&&&]:[aspect-ratio:1] [&&&&]:rounded-[50%] [&&&&::before]:inset-[25%] [&&&&::before]:[content:""] [&&&&::before]:rounded-[50%] [&&&&_b]:top-[8px] [&&&&_b]:left-[50%] [&&&&_b]:p-[0_var(--ors-space-1)] [&&&&_b]:transform-[translateX(-50%)] [@media(max-width:_700px)]:[&&&&]:[justify-self:center]'
        }
        style={style}
        aria-hidden="true"
      >
        <span
          className={
            "portrait-direction-axis horizontal absolute bg-line [.portrait-direction-axis&]:h-[1px] [.portrait-direction-axis&&&&]:top-[50%] [.portrait-direction-axis&&&&]:right-[8px] [.portrait-direction-axis&&&&]:left-[8px]"
          }
        />
        <span
          className={
            "portrait-direction-axis vertical absolute bg-line [.portrait-direction-axis&]:w-[1px] [.portrait-direction-axis&&&&]:top-[8px] [.portrait-direction-axis&&&&]:bottom-[8px] [.portrait-direction-axis&&&&]:left-[50%]"
          }
        />
        <span
          className={
            "portrait-direction-ray absolute w-[67px] h-[2px] [&_i]:absolute [&_i]:w-[12px] [&_i]:h-[12px] [&&&&]:top-[50%] [&&&&]:left-[50%] [&&&&]:[background:var(--portrait-light-color)] [&&&&]:shadow-[0_2px_8px_color-mix(in_srgb,_var(--portrait-light-color)_48%,_transparent)] [&&&&]:transform-[rotate(calc(var(--portrait-light-angle)_-_90deg))] [&&&&]:[transform-origin:left_center] [&&&&_i]:top-[calc(-5px_+_var(--portrait-light-height))] [&&&&_i]:right-[-6px] [&&&&_i]:[background:var(--portrait-light-color)] [&&&&_i]:[border:2px_solid_var(--ors-color-surface)] [&&&&_i]:rounded-[50%]"
          }
        >
          <i />
        </span>
        <b>前</b>
      </div>
      <div className="portrait-angle-controls">
        <RangeControl
          id="portrait-horizontal-angle"
          label="水平角度"
          min={-180}
          max={180}
          value={horizontal}
          unit="°"
          disabled={disabled}
          onChange={(value) => onChange(value, vertical)}
        />
        <RangeControl
          id="portrait-vertical-angle"
          label="垂直角度"
          min={-180}
          max={180}
          value={vertical}
          unit="°"
          disabled={disabled}
          onChange={(value) => onChange(horizontal, value)}
        />
      </div>
    </div>
  );
}

function RangeControl({
  id,
  label,
  min,
  max,
  value,
  unit = "",
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={
        'portrait-range-control grid gap-[var(--ors-space-3)] items-center [&_>_label]:font-semibold mt-[var(--ors-space-5)] [&_input[type=range]]:w-full [.portrait-angle-controls_&:first-child]:mt-0 [&&&&]:grid-cols-[minmax(84px,_0.34fr)_minmax(0,_1fr)_88px] [&&&&_input[type="range"]]:[accent-color:var(--ors-color-accent)] [@media(max-width:_480px)]:[&&&&]:grid-cols-[minmax(0,_1fr)_88px] [@media(max-width:_480px)]:[&&&&_>_input[type="range"]]:[grid-column:1_/_3] [@media(max-width:_480px)]:[&&&&_>_input[type="range"]]:[grid-row:2]'
      }
    >
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <NumericInput
        ariaLabel={`${label}数值`}
        value={value}
        min={min}
        max={max}
        unit={unit}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function ColorControl({
  id,
  color,
  hex,
  disabled,
  onChange,
}: {
  id: string;
  color: [number, number, number];
  hex: string;
  disabled: boolean;
  onChange: (value: [number, number, number]) => void;
}) {
  const [hexDraft, setHexDraft] = useState(hex.toUpperCase());
  const [editingHex, setEditingHex] = useState(false);
  const cancelHexCommit = useRef(false);

  const commitHex = (draft: string) => {
    const normalized = draft.startsWith("#") ? draft : `#${draft}`;
    if (/^#[0-9a-f]{6}$/i.test(normalized)) {
      if (normalized.toLowerCase() !== hex) onChange(hexToColor(normalized));
      setHexDraft(normalized.toUpperCase());
      return;
    }
    setHexDraft(hex.toUpperCase());
  };

  return (
    <div
      className={
        "portrait-color-control grid gap-[var(--ors-space-3)] items-center mt-[var(--ors-space-5)] [&_>_label]:font-semibold [&&&&]:grid-cols-[minmax(84px,_0.34fr)_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:grid-cols-[72px_minmax(0,_1fr)] [@media(max-width:_390px)]:[&&&&]:grid-cols-[1fr]"
      }
    >
      <label htmlFor={id}>颜色</label>
      <div
        className={
          "portrait-color-editor grid gap-[var(--ors-space-2)] items-center min-w-0 [&_input[type=color]]:w-[56px] [&_input[type=color]]:h-[40px] [&_input[type=color]]:p-[3px] [&_input[type=color]]:bg-canvas [&_input[type=color]]:border [&_input[type=color]]:border-solid [&_input[type=color]]:border-control [&_input[type=color]]:rounded-[var(--ors-radius-control)] [&&&&]:grid-cols-[56px_minmax(0,_1fr)]"
        }
      >
        <input
          id={id}
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(event) => onChange(hexToColor(event.target.value))}
        />
        <input
          className={
            "portrait-hex-input min-w-0 h-[38px] text-ink bg-canvas border border-solid border-control rounded-[var(--ors-radius-control)] w-full [&:focus]:border-accent [&:disabled]:text-disabled [&:disabled]:bg-surface [&&&&]:p-[7px_9px] [&&&&]:[text-transform:uppercase] [&&&&:focus]:[outline:2px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] [&&&&:focus]:[outline-offset:1px]"
          }
          aria-label="十六进制颜色"
          value={editingHex ? hexDraft : hex.toUpperCase()}
          maxLength={7}
          spellCheck={false}
          disabled={disabled}
          onFocus={() => {
            setHexDraft(hex.toUpperCase());
            setEditingHex(true);
          }}
          onChange={(event) => setHexDraft(event.target.value.toUpperCase())}
          onBlur={() => {
            if (cancelHexCommit.current) {
              cancelHexCommit.current = false;
              setHexDraft(hex.toUpperCase());
            } else {
              commitHex(hexDraft);
            }
            setEditingHex(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              cancelHexCommit.current = true;
              event.currentTarget.blur();
            }
          }}
        />
        <div
          className={
            "portrait-rgb-inputs grid gap-[var(--ors-space-2)] min-w-0 [&&&&]:[grid-column:1_/_3] [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))]"
          }
        >
          {(["R", "G", "B"] as const).map((channel, index) => (
            <NumericInput
              key={channel}
              ariaLabel={`${channel} 通道`}
              prefix={channel}
              value={color[index]}
              min={0}
              max={255}
              disabled={disabled}
              onChange={(value) => {
                const next = [...color] as [number, number, number];
                next[index] = value;
                onChange(next);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NumericInput({
  ariaLabel,
  value,
  min,
  max,
  prefix,
  unit = "",
  disabled,
  commitAlways = false,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  prefix?: string;
  unit?: string;
  disabled: boolean;
  commitAlways?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const cancelCommit = useRef(false);

  const commit = (nextDraft: string) => {
    const parsed = nextDraft.trim() === "" ? Number.NaN : Number(nextDraft);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed)))
      : value;
    setDraft(String(next));
    if (next !== value || commitAlways) onChange(next);
  };

  return (
    <label
      className={
        "portrait-number-field min-w-0 h-[38px] text-ink bg-canvas border border-solid border-control rounded-[var(--ors-radius-control)] grid items-center tabular-nums [&_input]:w-full [&_input]:min-w-0 [&_input]:h-full [&_input]:border-0 [&_input]:tabular-nums [&_input]:text-right [&_input::-webkit-inner-spin-button]:m-0 [&_input::-webkit-outer-spin-button]:m-0 [&_>_span]:pr-[8px] [&_>_span]:text-muted [&_>_span]:text-[13px] [&:focus-within]:border-accent [&[data-disabled=true]]:text-disabled [&[data-disabled=true]]:bg-surface max-[390px]:[.portrait-timeline-controls_>_&]:w-[88px] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_input]:p-[6px_8px] [&&&&_input]:[color:inherit] [&&&&_input]:[background:transparent] [&&&&_input]:[outline:0] [&&&&_input]:[font:inherit] [&&&&_input]:[appearance:textfield] [&&&&_input::-webkit-inner-spin-button]:[appearance:none] [&&&&_input::-webkit-outer-spin-button]:[appearance:none] [&&&&:focus-within]:[outline:2px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] [&&&&:focus-within]:[outline-offset:1px] [@media(max-width:_390px)]:[.portrait-timeline-controls_>_&&&&]:[grid-column:1_/_4] [@media(max-width:_390px)]:[.portrait-timeline-controls_>_&&&&]:[justify-self:end]"
      }
      data-disabled={disabled || undefined}
    >
      {prefix && (
        <span
          className="portrait-number-prefix [.portrait-number-field_>_&]:pr-0 [.portrait-number-field_>_&]:pl-[8px]"
          aria-hidden="true"
        >
          {prefix}
        </span>
      )}
      <input
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        value={editing ? draft : String(value)}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onFocus={(event) => {
          setDraft(String(value));
          setEditing(true);
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelCommit.current) {
            cancelCommit.current = false;
            setDraft(String(value));
          } else {
            commit(draft);
          }
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelCommit.current = true;
            event.currentTarget.blur();
          }
        }}
      />
      {unit && <span aria-hidden="true">{unit}</span>}
    </label>
  );
}

function PortraitStatus({
  phase,
  lighting,
}: {
  phase: "idle" | "connecting" | "ready" | "unsupported";
  lighting: PortraitLighting | null;
}) {
  const label =
    phase === "connecting"
      ? "正在连接"
      : phase === "unsupported"
        ? "未适配"
        : phase !== "ready"
          ? "未连接"
          : lighting?.editorOpen
            ? lighting.characterReady
              ? "已连接"
              : "正在载入"
            : "等待肖像编辑";
  return (
    <span
      className={
        'portrait-status inline-flex gap-[var(--ors-space-2)] items-center text-muted text-[13px] font-semibold [&::before]:w-[8px] [&::before]:h-[8px] [&::before]:bg-disabled [&[data-state=ready]::before]:bg-success [&[data-state=connecting]::before]:bg-warning [&[data-state=unsupported]::before]:bg-danger [&&&&::before]:[content:""] [&&&&::before]:rounded-[50%]'
      }
      data-state={
        phase === "ready" && lighting?.characterReady ? "ready" : phase
      }
    >
      {label}
    </span>
  );
}

function PortraitEditorNotice({
  title,
  description,
  loading = false,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <section
      className={
        "portrait-editor-notice [&_h2]:m-0 [&_p]:text-muted flex gap-[var(--ors-space-4)] items-start max-w-[720px] mt-[var(--ors-space-8)] py-[var(--ors-space-5)] [&_>_svg]:w-[32px] [&_>_svg]:h-[32px] [&_>_svg]:text-accent [&&&&_p]:m-[var(--ors-space-1)_0_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_>_svg]:flex-[0_0_auto]"
      }
      aria-live="polite"
    >
      {loading ? (
        <SpinnerGap
          className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
          aria-hidden="true"
        />
      ) : (
        <Aperture aria-hidden="true" />
      )}
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}

function PortraitError({ code }: { code: string }) {
  const error = {
    portrait_lighting_unsupported: {
      title: "当前版本未适配",
      message: "更新游戏桥接文件后重试。",
    },
    portrait_lighting_read_only: {
      title: "当前版本无法修改光照",
      message: "更新游戏桥接文件后重试。",
    },
    process_not_found: {
      title: "未找到游戏进程",
      message: "请先启动游戏。",
    },
    multiple_processes: {
      title: "发现多个游戏进程",
      message: "请只保留一个游戏进程。",
    },
    portrait_editor_closed: {
      title: "肖像编辑器已关闭",
      message: "重新打开后再试。",
    },
    portrait_character_loading: {
      title: "肖像仍在载入",
      message: "请稍候。",
    },
    portrait_animation_read_only: {
      title: "当前版本无法修改动作",
      message: "更新游戏桥接文件后重试。",
    },
    portrait_animation_unavailable: {
      title: "当前动作没有时间轴",
      message: "在游戏中选择其他动作后重新读取。",
    },
    portrait_ui_unavailable: {
      title: "游戏光照控件尚未就绪",
      message: "请保持游戏内肖像编辑器打开后重新读取。",
    },
    unsupported_platform: {
      title: "仅支持 Windows",
      message: "请使用 Windows 桌面版。",
    },
  }[code] ?? { title: "读取失败", message: "重新读取后再试。" };
  return (
    <div
      className={
        "portrait-error flex gap-[var(--ors-space-3)] items-start mt-[var(--ors-space-5)] p-[var(--ors-space-4)] text-danger bg-surface border border-solid border-danger rounded-[var(--ors-radius-control)] [&_>_svg]:w-[22px] [&_>_svg]:h-[22px] [&_div]:grid [&_div]:gap-[var(--ors-space-1)] [&_span]:text-ink [&_span]:text-[13px] [&&&&_>_svg]:flex-[0_0_auto]"
      }
      role="alert"
    >
      <WarningCircle aria-hidden="true" />
      <div>
        <strong>{error.title}</strong>
        <span>{error.message}</span>
      </div>
    </div>
  );
}

function portraitOpenType(value: number) {
  return value === 2 ? "冒险者铭牌" : value === 1 ? "套装肖像" : "肖像编辑";
}

function formatAnimationTime(value: number) {
  if (!Number.isFinite(value)) return "0.00 秒";
  return `${Math.max(0, value).toFixed(2)} 秒`;
}

function colorToHex(color: [number, number, number]) {
  return `#${color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToColor(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}
