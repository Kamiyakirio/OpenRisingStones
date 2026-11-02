/** External control surface for the game's native portrait lighting editor. */
import clsx from "clsx";
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

/** Reused presentation strings stay static and are allocated once for this module. */
const portraitSecondaryButtonClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] portrait-secondary-button flex min-h-10 items-center justify-center gap-[var(--ors-space-2)] rounded-control border border-solid border-control bg-surface px-3.5 py-2 font-semibold text-ink enabled:hover:bg-hover max-[480px]:w-full";
const portraitDescriptionClasses =
  "mx-0 mt-[var(--ors-space-1)] mb-0 text-muted";
const portraitLightIconClasses =
  "portrait-light-icon grid h-9 w-9 place-items-center rounded-control bg-selected text-accent";
const portraitTimelineButtonClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] min-h-9 pointer-coarse:min-h-11 inline-flex h-9 w-9 items-center justify-center rounded-control border border-solid border-control bg-canvas p-0 text-ink enabled:hover:bg-hover [@media(pointer:_coarse)]:size-11";

export function PortraitPage() {
  const editor = usePortraitLighting();
  const lighting = editor.lighting;
  const connected = editor.phase === "ready";
  const editable = Boolean(
    lighting?.editorOpen && lighting.characterReady && !editor.updateFailed,
  );
  return (
    <main className="portrait-page mx-auto min-h-[calc(100dvh-56px)] w-full max-w-400 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4">
      <header className="portrait-header flex items-start justify-between gap-[var(--ors-space-8)] border-b border-solid border-line pb-[var(--ors-space-6)] max-[700px]:flex-col max-[700px]:items-stretch">
        <div className="">
          <h1 className="m-0 text-2xl font-bold tracking-tight">肖像助手</h1>
          <p className="mx-0 mt-[var(--ors-space-2)] mb-0 max-w-[65ch] text-muted">
            调整动作时间和光照。
          </p>
        </div>
        <div className="portrait-header-actions flex shrink-0 items-center gap-[var(--ors-space-3)] max-[700px]:items-stretch max-[700px]:justify-between max-[480px]:flex-col">
          <PortraitStatus phase={editor.phase} lighting={lighting} />
          {connected && (
            <button
              className={portraitSecondaryButtonClasses}
              type="button"
              disabled={editor.updating}
              onClick={() => void editor.refresh()}
            >
              <ArrowClockwise className="h-4.5 w-4.5" aria-hidden="true" />
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
          description={<p className="m-0">不接受以上风险，请取消。</p>}
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
    <section className="portrait-introduction mt-7 grid max-w-240 grid-cols-[48px_minmax(0,1fr)] gap-5 rounded-panel border border-line bg-surface p-6 max-[480px]:grid-cols-[36px_minmax(0,_1fr)]">
      <Aperture
        className="h-11 w-11 text-accent max-[480px]:h-8 max-[480px]:w-8"
        aria-hidden="true"
      />
      <div className="">
        <h2 className="m-0 text-lg font-semibold">连接游戏</h2>
        <p className={portraitDescriptionClasses}>
          先在游戏中打开肖像编辑，再连接。
        </p>
      </div>
      <button
        className="portrait-connect-button col-start-2 flex min-h-10 items-center justify-center gap-[var(--ors-space-2)] justify-self-start rounded-control border border-solid border-accent bg-accent px-3.5 py-2 font-semibold text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover max-[480px]:col-[1_/_3] max-[480px]:justify-self-stretch"
        type="button"
        disabled={connecting || phase === "unsupported"}
        onClick={onConnect}
      >
        {connecting ? (
          <SpinnerGap
            className="spin h-4.5 w-4.5 animate-[login-spin_900ms_linear_infinite]"
            aria-hidden="true"
          />
        ) : (
          <PlugsConnected className="h-4.5 w-4.5" aria-hidden="true" />
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
      <div className="portrait-workspace-bar flex min-h-16 flex-wrap items-center gap-5 rounded-panel border border-line bg-surface px-4 py-3 max-[700px]:flex-col max-[700px]:items-stretch">
        <div className="first:[margin-right:auto] first:grid first:min-w-0 first:gap-0.5">
          <strong className="">{portraitOpenType(lighting.openType)}</strong>
          <span className="text-[13px] text-muted">
            {lighting.hasChanges ? "游戏中有未保存的修改" : "已同步"}
          </span>
        </div>
        {(updating || updateFailed) && (
          <div
            className="portrait-sync-state flex items-center gap-[var(--ors-space-2)] text-[13px] whitespace-nowrap text-muted first:[margin-right:auto] first:grid first:min-w-0 first:gap-0.5"
            aria-live="polite"
          >
            {updating && (
              <SpinnerGap
                className="spin animate-[login-spin_900ms_linear_infinite]"
                aria-hidden="true"
              />
            )}
            {updating ? "正在写入" : "写入失败"}
          </div>
        )}
        <button
          className={portraitSecondaryButtonClasses}
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

      <div className="portrait-lighting-console mt-[var(--ors-space-6)] grid grid-cols-[minmax(0,_0.84fr)_minmax(0,_1.16fr)] gap-[var(--ors-space-6)] max-[1050px]:grid-cols-[1fr]">
        <LightingPanel
          className="portrait-ambient-panel"
          icon={<MoonStars className="h-[21px] w-[21px]" aria-hidden="true" />}
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
          icon={
            <LightbulbFilament
              className="h-[21px] w-[21px]"
              aria-hidden="true"
            />
          }
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
              (current) => ({
                ...current,
                directionalBrightness: value,
              }),
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

      <p className="portrait-save-note mx-0 mt-[var(--ors-space-5)] mb-0 max-w-[70ch] text-[13px] text-muted">
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
    <section className="portrait-animation-panel mt-[var(--ors-space-6)] rounded-panel border border-solid border-line bg-surface px-[var(--ors-space-5)] py-[var(--ors-space-4)] max-[700px]:p-[var(--ors-space-4)]">
      <header className="grid grid-cols-[36px_minmax(0,_1fr)_auto] items-center gap-[var(--ors-space-3)] max-[480px]:grid-cols-[36px_minmax(0,_1fr)]">
        <span className={portraitLightIconClasses}>
          <FilmStrip className="h-[21px] w-[21px]" aria-hidden="true" />
        </span>
        <div className="">
          <h2 className="m-0 text-lg font-semibold">动作时间轴</h2>
          <p className="mx-0 mt-[var(--ors-space-1)] mb-0 text-[13px] text-muted tabular-nums">
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
          className="portrait-play-button inline-flex min-h-9.5 min-w-22 items-center justify-center gap-[var(--ors-space-2)] rounded-control border border-solid border-control bg-canvas px-3 py-[7px] font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover max-[480px]:col-[1_/_3] max-[480px]:w-full"
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
            <Play className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Pause className="h-4.5 w-4.5" aria-hidden="true" />
          )}
          {lighting.animationPaused ? "播放" : "暂停"}
        </button>
      </header>
      <div className="portrait-timeline-controls mt-[var(--ors-space-4)] grid grid-cols-[36px_minmax(0,_1fr)_36px_88px_auto] items-center gap-[var(--ors-space-3)] border-t border-solid border-line pt-[var(--ors-space-4)] max-[480px]:grid-cols-[36px_minmax(0,_1fr)_36px_88px] max-[390px]:grid-cols-[36px_minmax(0,_1fr)_36px] [@media(pointer:_coarse)]:grid-cols-[44px_minmax(0,_1fr)_44px_88px_auto] [@media(pointer:_coarse)_and_(max-width:_390px)]:grid-cols-[44px_minmax(0,_1fr)_44px] [@media(pointer:_coarse)_and_(max-width:_480px)]:grid-cols-[44px_minmax(0,_1fr)_44px_88px]">
        <button
          className={portraitTimelineButtonClasses}
          type="button"
          aria-label="上一帧"
          disabled={controlDisabled || currentFrame === 0}
          onClick={() => seek(currentFrame - 1)}
        >
          <CaretLeft className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <input
          className={
            '[&[type="range"]]:[accent-color:var(--ors-color-accent)] [&[type=range]]:w-full'
          }
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
          className={portraitTimelineButtonClasses}
          type="button"
          aria-label="下一帧"
          disabled={controlDisabled || currentFrame === totalFrames}
          onClick={() => seek(currentFrame + 1)}
        >
          <CaretRight className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <NumericInput
          ariaLabel="当前动作帧"
          value={currentFrame}
          min={0}
          max={totalFrames}
          disabled={controlDisabled}
          commitAlways
          onChange={seek}
          layout="timeline-controls"
        />
        <span className="portrait-timeline-duration text-[13px] whitespace-nowrap text-muted tabular-nums max-[480px]:col-[1_/_5] max-[480px]:text-right max-[390px]:col-[1_/_4]">
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
      className={clsx(
        "portrait-light-panel min-w-0 self-start rounded-panel border border-solid border-line bg-surface p-[var(--ors-space-5)] max-[700px]:p-[var(--ors-space-4)]",
        className,
      )}
    >
      <header className="grid grid-cols-[36px_minmax(0,_1fr)_auto] items-start gap-[var(--ors-space-3)] border-b border-solid border-line pb-[var(--ors-space-5)]">
        <span className={portraitLightIconClasses}>{icon}</span>
        <div className="">
          <h2 className="m-0 text-lg font-semibold">{title}</h2>
          <p className="mx-0 mt-[var(--ors-space-1)] mb-0 max-w-[48ch] text-[13px] text-muted">
            {description}
          </p>
        </div>
        <button
          className="min-h-9 rounded-control border border-solid border-line bg-transparent px-2.5 py-1.5 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover"
          type="button"
          disabled={disabled}
          onClick={onReset}
        >
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
    <div className="portrait-direction-control mt-[var(--ors-space-6)] grid grid-cols-[176px_minmax(0,_1fr)] items-center gap-[var(--ors-space-6)] border-t border-solid border-line pt-[var(--ors-space-5)] max-[1050px]:grid-cols-[168px_minmax(0,_1fr)] max-[700px]:grid-cols-[1fr]">
      <div
        className={
          'portrait-direction-dial relative [aspect-ratio:1] w-42 rounded-[50%] border border-solid border-control before:absolute before:inset-[25%] before:rounded-[50%] before:border before:border-solid before:border-line before:[content:""] max-[700px]:justify-self-center'
        }
        style={style}
        aria-hidden="true"
      >
        <span className="portrait-direction-axis horizontal absolute top-1/2 right-2 left-2 h-px bg-line" />
        <span className="portrait-direction-axis vertical absolute top-2 bottom-2 left-1/2 w-px bg-line" />
        <span className="portrait-direction-ray absolute top-1/2 left-1/2 h-0.5 w-[67px] [transform-origin:left_center] transform-[rotate(calc(var(--portrait-light-angle)_-_90deg))] bg-[var(--portrait-light-color)] shadow-[0_2px_8px_color-mix(in_srgb,_var(--portrait-light-color)_48%,_transparent)]">
          <i className="absolute top-[calc(-5px_+_var(--portrait-light-height))] right-[-6px] h-3 w-3 rounded-[50%] bg-[var(--portrait-light-color)] [border:2px_solid_var(--ors-color-surface)]" />
        </span>
        <b className="absolute top-2 left-1/2 transform-[translateX(-50%)] bg-surface px-[var(--ors-space-1)] py-0 text-xs font-medium text-muted">
          前
        </b>
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
          layout="angle-controls"
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
          layout="angle-controls"
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
  layout,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  disabled: boolean;
  onChange: (value: number) => void;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "angle-controls";
}) {
  return (
    <div
      className={clsx(
        "portrait-range-control mt-[var(--ors-space-5)] grid grid-cols-[minmax(84px,_0.34fr)_minmax(0,_1fr)_88px] items-center gap-[var(--ors-space-3)] max-[480px]:grid-cols-[minmax(0,_1fr)_88px]",
        layout === "angle-controls" && "first:mt-0",
      )}
    >
      <label className="font-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        className={
          '[&[type="range"]]:[accent-color:var(--ors-color-accent)] max-[480px]:[&[type="range"]]:col-[1_/_3] max-[480px]:[&[type="range"]]:row-start-2 [&[type=range]]:w-full'
        }
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
        layout="range-control"
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
    <div className="portrait-color-control mt-[var(--ors-space-5)] grid grid-cols-[minmax(84px,_0.34fr)_minmax(0,_1fr)] items-center gap-[var(--ors-space-3)] max-[700px]:grid-cols-[72px_minmax(0,_1fr)] max-[390px]:grid-cols-[1fr]">
      <label className="font-semibold" htmlFor={id}>
        颜色
      </label>
      <div className="portrait-color-editor grid min-w-0 grid-cols-[56px_minmax(0,_1fr)] items-center gap-[var(--ors-space-2)]">
        <input
          className="min-h-9 pointer-coarse:min-h-11 [&[type=color]]:h-10 [&[type=color]]:w-14 [&[type=color]]:rounded-control [&[type=color]]:border [&[type=color]]:border-solid [&[type=color]]:border-control [&[type=color]]:bg-canvas [&[type=color]]:p-[3px]"
          id={id}
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(event) => onChange(hexToColor(event.target.value))}
        />
        <input
          className="portrait-hex-input h-9.5 min-h-9 w-full min-w-0 rounded-control border border-solid border-control bg-canvas px-[9px] py-[7px] text-ink [text-transform:uppercase] focus:border-accent focus:[outline:2px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] focus:[outline-offset:1px] disabled:bg-surface disabled:text-disabled pointer-coarse:min-h-11"
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
        <div className="portrait-rgb-inputs col-[1_/_3] grid min-w-0 grid-cols-3 gap-[var(--ors-space-2)]">
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
  layout,
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
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "timeline-controls" | "range-control";
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
      className={clsx(
        "portrait-number-field grid h-9.5 min-w-0 grid-cols-[auto_minmax(0,_1fr)_auto] items-center rounded-control border border-solid border-control bg-canvas text-ink tabular-nums focus-within:border-accent focus-within:[outline:2px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] focus-within:[outline-offset:1px] data-[disabled=true]:bg-surface data-[disabled=true]:text-disabled",
        layout === "timeline-controls" &&
          "max-[390px]:col-[1_/_4] max-[390px]:w-22 max-[390px]:justify-self-end",
        layout === "range-control" && "font-semibold",
      )}
      data-disabled={disabled || undefined}
    >
      {prefix && (
        <span
          className="portrait-number-prefix px-2 text-[13px] text-muted"
          aria-hidden="true"
        >
          {prefix}
        </span>
      )}
      <input
        className="h-full min-h-9 w-full min-w-0 [appearance:textfield] border-0 bg-transparent px-2 py-1.5 text-right text-[inherit] tabular-nums outline-none [font:inherit] pointer-coarse:min-h-11 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:[appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:[appearance:none]"
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
      {unit && (
        <span className="pr-2 text-[13px] text-muted" aria-hidden="true">
          {unit}
        </span>
      )}
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
        'portrait-status inline-flex items-center gap-[var(--ors-space-2)] text-[13px] font-semibold text-muted before:h-2 before:w-2 before:rounded-[50%] before:bg-disabled before:[content:""] data-[state=connecting]:before:bg-warning data-[state=ready]:before:bg-success data-[state=unsupported]:before:bg-danger'
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
      className="portrait-editor-notice mt-[var(--ors-space-8)] flex max-w-180 items-start gap-[var(--ors-space-4)] py-[var(--ors-space-5)] [border-block:1px_solid_var(--ors-color-line)]"
      aria-live="polite"
    >
      {loading ? (
        <SpinnerGap
          className="spin h-8 w-8 shrink-0 animate-[login-spin_900ms_linear_infinite] text-accent"
          aria-hidden="true"
        />
      ) : (
        <Aperture className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
      )}
      <div className="">
        <h2 className="m-0 text-lg font-semibold">{title}</h2>
        <p className={portraitDescriptionClasses}>{description}</p>
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
  }[code] ?? {
    title: "读取失败",
    message: "重新读取后再试。",
  };
  return (
    <div
      className="portrait-error mt-[var(--ors-space-5)] flex items-start gap-[var(--ors-space-3)] rounded-control border border-solid border-danger bg-surface p-[var(--ors-space-4)] text-danger"
      role="alert"
    >
      <WarningCircle className="h-5.5 w-5.5 shrink-0" aria-hidden="true" />
      <div className="grid gap-[var(--ors-space-1)]">
        <strong className="">{error.title}</strong>
        <span className="text-[13px] text-ink">{error.message}</span>
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
