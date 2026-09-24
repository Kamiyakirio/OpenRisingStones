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
import { usePortraitLighting } from "../features/portrait/usePortraitLighting";
import {
  PORTRAIT_ANIMATION_FIELDS,
  PORTRAIT_LIGHTING_FIELDS,
  type PortraitLighting,
} from "../features/portrait/types";
import "./PortraitPage.css";

export function PortraitPage() {
  const editor = usePortraitLighting();
  const lighting = editor.lighting;
  const connected = editor.phase === "ready";
  const editable = Boolean(
    lighting?.editorOpen && lighting.characterReady && !editor.updateFailed,
  );

  return (
    <main className="portrait-page">
      <header className="portrait-header">
        <div>
          <h1>肖像助手</h1>
          <p>调整动作时间和光照。</p>
        </div>
        <div className="portrait-header-actions">
          <PortraitStatus phase={editor.phase} lighting={lighting} />
          {connected && (
            <button
              className="portrait-secondary-button"
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
    <section className="portrait-introduction">
      <Aperture aria-hidden="true" />
      <div>
        <h2>连接游戏</h2>
        <p>先在游戏中打开肖像编辑，再连接。</p>
      </div>
      <button
        className="portrait-connect-button"
        type="button"
        disabled={connecting || phase === "unsupported"}
        onClick={onConnect}
      >
        {connecting ? (
          <SpinnerGap className="spin" aria-hidden="true" />
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
  editable,
  updating,
  updateFailed,
  onChange,
  onAnimationChange,
}: {
  lighting: PortraitLighting;
  initial: PortraitLighting | null;
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
    <div className="portrait-workspace">
      <div className="portrait-workspace-bar">
        <div>
          <strong>{portraitOpenType(lighting.openType)}</strong>
          <span>{lighting.hasChanges ? "游戏中有未保存的修改" : "已同步"}</span>
        </div>
        {(updating || updateFailed) && (
          <div className="portrait-sync-state" aria-live="polite">
            {updating && <SpinnerGap className="spin" aria-hidden="true" />}
            {updating ? "正在写入" : "写入失败"}
          </div>
        )}
        <button
          className="portrait-secondary-button"
          type="button"
          disabled={!initial || !editable}
          onClick={resetAll}
        >
          重置全部光照
        </button>
      </div>

      <AnimationTimeline
        lighting={lighting}
        disabled={!editable}
        onChange={onAnimationChange}
      />

      <div className="portrait-lighting-console">
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

      <p className="portrait-save-note">
        {updateFailed
          ? "写入失败，已恢复游戏中的值。重新读取后再试。"
          : "修改后请在游戏中保存。"}
      </p>
    </div>
  );
}

function AnimationTimeline({
  lighting,
  disabled,
  onChange,
}: {
  lighting: PortraitLighting;
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
    <section className="portrait-animation-panel">
      <header>
        <span className="portrait-light-icon">
          <FilmStrip aria-hidden="true" />
        </span>
        <div>
          <h2>动作时间轴</h2>
          <p>
            {unavailable
              ? "当前动作没有可调时间轴。"
              : !lighting.animationEditable
                ? "当前版本只能读取动作时间。"
                : `第 ${currentFrame} 帧，共 ${totalFrames} 帧`}
          </p>
        </div>
        <button
          className="portrait-play-button"
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
      <div className="portrait-timeline-controls">
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
        <span className="portrait-timeline-duration">
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
    <section className={`portrait-light-panel ${className}`}>
      <header>
        <span className="portrait-light-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
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
    <div className="portrait-direction-control">
      <div className="portrait-direction-dial" style={style} aria-hidden="true">
        <span className="portrait-direction-axis horizontal" />
        <span className="portrait-direction-axis vertical" />
        <span className="portrait-direction-ray">
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
    <div className="portrait-range-control">
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
    <div className="portrait-color-control">
      <label htmlFor={id}>颜色</label>
      <div className="portrait-color-editor">
        <input
          id={id}
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(event) => onChange(hexToColor(event.target.value))}
        />
        <input
          className="portrait-hex-input"
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
        <div className="portrait-rgb-inputs">
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
      className="portrait-number-field"
      data-disabled={disabled || undefined}
    >
      {prefix && (
        <span className="portrait-number-prefix" aria-hidden="true">
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
      className="portrait-status"
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
    <section className="portrait-editor-notice" aria-live="polite">
      {loading ? (
        <SpinnerGap className="spin" aria-hidden="true" />
      ) : (
        <Aperture aria-hidden="true" />
      )}
      <div>
        <h2>{title}</h2>
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
    <div className="portrait-error" role="alert">
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
