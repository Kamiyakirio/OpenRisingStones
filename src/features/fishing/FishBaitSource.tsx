/** Share one Wiki acquisition popup across all bait labels in a fish detail. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { isTauriRuntime } from "../../shared/utils/runtime";
import { useWikiItem } from "../../shared/wiki/useWikiItem";
import type { FishCatalog } from "./types";

type ActiveBait = { key: string; id: number };
type BaitSourceContextValue = {
  catalog: FishCatalog;
  active: ActiveBait | null;
  panelId: string;
  show: (key: string, id: number, trigger: HTMLButtonElement) => void;
  keepOpen: () => void;
  dismiss: () => void;
};

const BaitSourceContext = createContext<BaitSourceContextValue | null>(null);

export function FishBaitSourceProvider({
  catalog,
  children,
}: {
  catalog: FishCatalog;
  children: ReactNode;
}) {
  const wiki = useWikiItem(false);
  const [active, setActive] = useState<ActiveBait | null>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 440,
    maxHeight: 370,
  });
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const desktop = isTauriRuntime();
  const name = active ? catalog.items[active.id] || String(active.id) : "";

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(440, window.innerWidth - 32);
    const left = Math.max(
      16,
      Math.min(rect.left, window.innerWidth - width - 16),
    );
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const placeAbove = below < 180 && above > below;
    const maxHeight = Math.min(
      370,
      Math.max(120, (placeAbove ? above : below) - 8),
    );
    setPosition({
      top: placeAbove ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6,
      left,
      width,
      maxHeight,
    });
  }, []);

  function keepOpen() {
    clearTimeout(closeTimer.current);
  }
  function dismiss() {
    closeTimer.current = setTimeout(() => setActive(null), 200);
  }
  function show(key: string, id: number, trigger: HTMLButtonElement) {
    keepOpen();
    triggerRef.current = trigger;
    updatePosition();
    if (active?.key === key) return;
    setActive({ key, id });
    if (desktop) void wiki.load(catalog.items[id] || String(id), id);
  }

  useEffect(() => {
    if (!active) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [active, updatePosition]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <BaitSourceContext.Provider
      value={{ catalog, active, panelId, show, keepOpen, dismiss }}
    >
      {children}
      {active &&
        createPortal(
          <aside
            id={panelId}
            className="fish-bait-source"
            aria-label={`${name}获取方式`}
            style={position}
            onMouseEnter={keepOpen}
            onMouseLeave={dismiss}
            onFocus={keepOpen}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
            }}
          >
            <header>
              <strong>{name} · 获取方式</strong>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="关闭获取方式"
              >
                关闭
              </button>
            </header>
            {!desktop ? (
              <p>桌面客户端可读取获取方式；也可打开 Wiki 查看。</p>
            ) : wiki.status === "ready" ? (
              <>
                {wiki.item?.unobtainable && <p>此物品目前无法获取。</p>}
                {wiki.item?.acquisitions.length ? (
                  wiki.item.acquisitions.map((source, index) => (
                    <section key={index}>
                      <h4>{source.label}</h4>
                      <p>{source.summary}</p>
                      {source.details.map((detail, i) => (
                        <div key={i} className="fish-bait-source-detail">
                          <strong>{detail.title}</strong>
                          <p>
                            {[
                              detail.description,
                              detail.location,
                              detail.requirement,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {detail.items.length > 0 && (
                            <p>
                              {detail.items
                                .map(
                                  (item) =>
                                    `${item.name} ${item.quantity} ${item.note}`,
                                )
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </section>
                  ))
                ) : (
                  <p>Wiki 暂无可解析的获取方式，可打开原页查看。</p>
                )}
              </>
            ) : wiki.status === "error" ? (
              <div role="alert">
                <p>获取方式读取失败，请重试或打开 Wiki。</p>
                <button
                  type="button"
                  onClick={() => void wiki.load(name, active.id)}
                >
                  重试
                </button>
              </div>
            ) : (
              <div role="status">
                <p>
                  {wiki.status === "interaction_required"
                    ? "Wiki 需要验证后继续读取。"
                    : "正在读取 Wiki 获取方式…"}
                </p>
                {wiki.status === "interaction_required" && (
                  <button
                    type="button"
                    onClick={() => void wiki.showVerification()}
                  >
                    显示验证面板
                  </button>
                )}
                {wiki.status === "background_verification" && (
                  <button
                    type="button"
                    onClick={() => {
                      void wiki.cancelVerification();
                      setActive(null);
                    }}
                  >
                    取消验证
                  </button>
                )}
              </div>
            )}
            <a
              href={`https://ff14.huijiwiki.com/wiki/${encodeURIComponent(`物品:${name}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              在 Wiki 查看完整资料
            </a>
          </aside>,
          document.getElementById("top") ?? document.body,
        )}
    </BaitSourceContext.Provider>
  );
}

export function FishBaitSource({
  baitId,
  children,
}: {
  baitId: number;
  children: ReactNode;
}) {
  const source = useContext(BaitSourceContext);
  const key = useId();
  if (!source) return <span>{children}</span>;
  const name = source.catalog.items[baitId] || String(baitId);
  const expanded = source.active?.key === key;
  return (
    <span className="fish-bait-source-anchor" onMouseLeave={source.dismiss}>
      <button
        type="button"
        className="fish-bait-source-trigger"
        aria-label={`查看${name}的获取方式`}
        aria-expanded={expanded}
        aria-controls={expanded ? source.panelId : undefined}
        onMouseEnter={(event) => source.show(key, baitId, event.currentTarget)}
        onFocus={(event) => source.show(key, baitId, event.currentTarget)}
        onClick={(event) => source.show(key, baitId, event.currentTarget)}
        onBlur={source.dismiss}
      >
        {children}
      </button>
    </span>
  );
}
