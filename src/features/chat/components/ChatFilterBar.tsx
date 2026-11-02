import { useId, useState } from "react";
import {
  chatCategories,
  chatChannels,
  isChatCategorySelected,
  matchesChatFilters,
  toggleChatFilter,
  type ChatFilter,
} from "../utils/channels";

/** Reused presentation strings stay static and are allocated once for this module. */
const filterOptionsClasses =
  "chat-filter-options grid grid-cols-2 gap-[0_12px]";
const filterOptionClasses =
  "flex min-h-11 cursor-pointer items-center gap-2 [overflow-wrap:anywhere]";
const filterCheckboxClasses =
  "m-0 h-4 w-4 shrink-0 [accent-color:var(--ors-color-accent)]";

export function ChatFilterBar({
  value,
  onChange,
  visibleCount,
  totalCount,
}: {
  value: ChatFilter[];
  onChange: (value: ChatFilter[]) => void;
  visibleCount: number;
  totalCount: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="chat-filter-bar flex items-center gap-3 px-5 py-2.5 text-xs text-muted [border-bottom:1px_solid_var(--ors-color-line)]">
      <span className="shrink-0 whitespace-nowrap tabular-nums">筛选</span>
      <button
        type="button"
        className="chat-filter-trigger flex min-h-11 max-w-[18rem] min-w-0 flex-1 cursor-pointer items-center justify-between rounded-control bg-surface px-2.5 py-1.5 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] [anchor-name:--chat-filter-control] [border:1px_solid_var(--ors-color-control-line)] [font:inherit] focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:2px]"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
      >
        {value.length === 0 ? "全部消息" : `已选 ${value.length} 项`}
        <span aria-hidden="true">⌄</span>
      </button>
      {/* Preserve narrow gutters when anchor-positioning support is also active. */}
      <div
        id={id}
        popover="auto"
        className="chat-filter-popup box-border max-h-[min(32rem,_65dvh)] w-[min(22rem,_calc(100vw_-_32px))] overflow-auto [overscroll-behavior:contain] rounded-[10px] bg-surface p-4 text-[13px] text-ink shadow-[0_8px_24px_#302d2826] [border:1px_solid_var(--ors-color-line)] focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:2px] max-[767px]:right-4 max-[767px]:left-4 max-[767px]:w-auto [@supports(position-anchor:_--chat-filter-control)]:inset-auto [@supports(position-anchor:_--chat-filter-control)]:top-[clamp(16px,_anchor(bottom),_calc(100dvh_-_min(32rem,_65dvh)_-_24px))] [@supports(position-anchor:_--chat-filter-control)]:left-[anchor(left)] [@supports(position-anchor:_--chat-filter-control)]:mx-0 [@supports(position-anchor:_--chat-filter-control)]:mt-2 [@supports(position-anchor:_--chat-filter-control)]:mb-0 [@supports(position-anchor:_--chat-filter-control)]:[position-anchor:--chat-filter-control] [@supports(position-anchor:_--chat-filter-control)]:[position-try-fallbacks:flip-block,_flip-inline]"
        role="group"
        aria-label="消息筛选"
        onToggle={(event) =>
          setOpen(event.currentTarget.matches(":popover-open"))
        }
      >
        <header className="flex items-center justify-between gap-3">
          <strong>消息筛选</strong>
          <button
            className="min-h-11 cursor-pointer rounded-[6px] bg-transparent px-2 py-1 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] [border:1px_solid_var(--ors-color-line)] [font:inherit]"
            type="button"
            onClick={() => onChange([])}
          >
            全部消息
          </button>
        </header>
        <p className="mx-0 my-2 leading-[1.6] text-muted">
          未勾选时显示全部；可同时选择多个分类或频道。
        </p>
        <div className={filterOptionsClasses}>
          {chatCategories.map((category) => {
            const selected = isChatCategorySelected(category.id, value);
            const partial =
              !selected &&
              chatChannels.some(
                (entry) =>
                  entry.category === category.id &&
                  value.includes(`channel:${entry.kind}`),
              );
            return (
              <label className={filterOptionClasses} key={category.id}>
                <input
                  className={filterCheckboxClasses}
                  type="checkbox"
                  checked={selected}
                  ref={(node) => {
                    if (node) node.indeterminate = partial;
                  }}
                  onChange={() =>
                    onChange(toggleChatFilter(value, `group:${category.id}`))
                  }
                />
                {category.label}
              </label>
            );
          })}
        </div>
        <details className="chat-filter-channels mt-2 [border-top:1px_solid_var(--ors-color-line)]">
          <summary className="cursor-pointer px-0 py-3">具体频道</summary>
          {chatCategories.slice(0, 4).map((category) => (
            <fieldset
              className="mx-0 my-2 min-w-0 border-0 p-0"
              key={category.id}
            >
              <legend className="font-semibold">{category.label}</legend>
              <div className={filterOptionsClasses}>
                {chatChannels
                  .filter((entry) => entry.category === category.id)
                  .map((entry) => (
                    <label className={filterOptionClasses} key={entry.kind}>
                      <input
                        className={filterCheckboxClasses}
                        type="checkbox"
                        checked={
                          value.length > 0 &&
                          matchesChatFilters(entry.kind, value)
                        }
                        onChange={() =>
                          onChange(
                            toggleChatFilter(value, `channel:${entry.kind}`),
                          )
                        }
                      />
                      {entry.label}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </details>
      </div>
      <span
        className="chat-filter-count [margin-left:auto] shrink-0 whitespace-nowrap tabular-nums"
        role="status"
        aria-live="polite"
      >
        {visibleCount} / {totalCount} 条
      </span>
    </div>
  );
}
