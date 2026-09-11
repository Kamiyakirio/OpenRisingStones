/** Bait images and Wiki acquisitions share the equipment workflow's transport and cache. */
import { useEffect, useRef, useState } from "react";
import { useWikiItem } from "../../shared/wiki/useWikiItem";
import { isTauriRuntime } from "../../shared/utils/runtime";
import type { FishCatalog } from "./types";
import { FishIcon } from "./FishIcon";

export function FishBait({
  steps,
  catalog,
}: {
  steps: (number | number[])[];
  catalog: FishCatalog;
}) {
  const wiki = useWikiItem(false);
  const [active, setActive] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (active === null) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [active]);
  const keepOpen = () => clearTimeout(closeTimer.current);
  const dismiss = () => {
    closeTimer.current = setTimeout(() => setActive(null), 200);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  function show(id: number) {
    keepOpen();
    if (active === id) return;
    setActive(id);
    if (isTauriRuntime()) void wiki.load(catalog.items[id], id);
  }
  return (
    <div
      className="fish-bait-area"
      onMouseEnter={keepOpen}
      onMouseLeave={dismiss}
      onFocus={keepOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setActive(null);
          event.stopPropagation();
        }
      }}
    >
      <ol className="fish-bait-chain">
        {steps.map((step, index) => (
          <li key={index}>
            <span className="fish-muted">
              {index === 0 ? "鱼饵" : "以小钓大"}
            </span>
            {(Array.isArray(step) ? step : [step]).map((id) => (
              <button
                key={id}
                className="fish-bait-item"
                aria-expanded={active === id}
                aria-controls={active === id ? "fish-bait-source" : undefined}
                onMouseEnter={() => show(id)}
                onFocus={() => show(id)}
                onClick={() => show(id)}
              >
                <FishIcon
                  fish={{ icon: String(catalog.itemIcons[id] || "") }}
                />
                <strong>{catalog.items[id] || id}</strong>
              </button>
            ))}
          </li>
        ))}
      </ol>
      {active !== null && (
        <aside
          id="fish-bait-source"
          className="fish-bait-source"
          aria-label={`${catalog.items[active]}获取方式`}
        >
          <header>
            <strong>{catalog.items[active]} · 获取方式</strong>
            <button onClick={() => setActive(null)} aria-label="关闭获取方式">
              关闭
            </button>
          </header>
          {!isTauriRuntime() ? (
            <p>在桌面客户端悬停可读取获取方式，网页中可打开 Wiki 查看。</p>
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
                onClick={() => void wiki.load(catalog.items[active], active)}
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
                <button onClick={() => void wiki.showVerification()}>
                  显示验证面板
                </button>
              )}
              {wiki.status === "background_verification" && (
                <button
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
            href={`https://ff14.huijiwiki.com/wiki/${encodeURIComponent(`物品:${catalog.items[active]}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            在 Wiki 查看完整资料
          </a>
        </aside>
      )}
    </div>
  );
}
