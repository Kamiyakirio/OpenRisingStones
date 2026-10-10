/** Shared checkbox filters; native popover keeps the controls outside the scrolling ledger. */
import { useId, useState } from "react";
import {
  chatCategories,
  chatChannels,
  isChatCategorySelected,
  matchesChatFilters,
  toggleChatFilter,
  type ChatFilter,
} from "../utils/channels";

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
    <div
      className={
        "chat-filter-bar flex gap-[12px] items-center text-xs [&_>_span]:tabular-nums [&_>_span]:whitespace-nowrap [&&&&]:p-[10px_20px] [&&&&]:[color:var(--ors-color-muted)] [&&&&]:[border-bottom:1px_solid_var(--ors-color-line)] [&&&&_>_span]:flex-[0_0_auto]"
      }
    >
      <span>筛选</span>
      <button
        type="button"
        className={
          "chat-filter-trigger flex justify-between items-center min-w-0 max-w-[18rem] min-h-[44px] rounded-[8px] cursor-pointer [&&&&]:flex-[1] [&&&&]:p-[6px_10px] [&&&&]:[color:var(--ors-color-text)] [&&&&]:[background:var(--ors-color-surface)] [&&&&]:[border:1px_solid_var(--ors-color-control-line)] [&&&&]:[font:inherit] [&&&&]:[anchor-name:--chat-filter-control] [&&&&:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&:focus-visible]:[outline-offset:2px]"
        }
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
        className={
          "chat-filter-popup box-border overflow-auto p-[16px] rounded-[10px] text-[13px] [&_header]:flex [&_header]:items-center [&_header]:justify-between [&_header]:gap-[12px] [&_header_button]:min-h-[44px] [&_header_button]:rounded-[6px] [&_header_button]:cursor-pointer [&&&&_:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:focus-visible]:[outline-offset:2px] [&&&&]:w-[min(22rem,_calc(100vw_-_32px))] [&&&&]:max-h-[min(32rem,_65dvh)] [&&&&]:[overscroll-behavior:contain] [&&&&]:[color:var(--ors-color-text)] [&&&&]:[background:var(--ors-color-surface)] [&&&&]:[border:1px_solid_var(--ors-color-line)] [&&&&]:shadow-[0_8px_24px_#302d2826] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:[position-anchor:--chat-filter-control] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:inset-[auto] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:top-[clamp(16px,_anchor(bottom),_calc(100dvh_-_min(32rem,_65dvh)_-_24px))] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:left-[anchor(left)] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:m-[8px_0_0] [@supports(position-anchor:_--chat-filter-control)]:[&&&&]:[position-try-fallbacks:flip-block,_flip-inline] [&&&&_header_button]:p-[4px_8px] [&&&&_header_button]:[color:var(--ors-color-accent)] [&&&&_header_button]:[background:transparent] [&&&&_header_button]:[border:1px_solid_var(--ors-color-line)] [&&&&_header_button]:[font:inherit] [&&&&_p]:m-[8px_0] [&&&&_p]:[color:var(--ors-color-muted)] [&&&&_p]:leading-[1.6] [@media(max-width:_767px)]:[&&&&&]:left-[16px] [@media(max-width:_767px)]:[&&&&&]:right-[16px] [@media(max-width:_767px)]:[&&&&&]:w-[auto]"
        }
        role="group"
        aria-label="消息筛选"
        onToggle={(event) =>
          setOpen(event.currentTarget.matches(":popover-open"))
        }
      >
        <header>
          <strong>消息筛选</strong>
          <button type="button" onClick={() => onChange([])}>
            全部消息
          </button>
        </header>
        <p>未勾选时显示全部；可同时选择多个分类或频道。</p>
        <div
          className={
            "chat-filter-options grid [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:min-h-[44px] [&_label]:cursor-pointer [&_input]:w-[16px] [&_input]:h-[16px] [&_input]:m-0 [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&]:gap-[0_12px] [&&&&_label]:[overflow-wrap:anywhere] [&&&&_input]:shrink-[0] [&&&&_input]:[accent-color:var(--ors-color-accent)]"
          }
        >
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
              <label key={category.id}>
                <input
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
        <details
          className={
            "chat-filter-channels mt-[8px] [&_summary]:cursor-pointer [&_fieldset]:min-w-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:font-semibold [&&&&]:[border-top:1px_solid_var(--ors-color-line)] [&&&&_summary]:p-[12px_0] [&&&&_fieldset]:m-[8px_0]"
          }
        >
          <summary>具体频道</summary>
          {chatCategories.slice(0, 4).map((category) => (
            <fieldset key={category.id}>
              <legend>{category.label}</legend>
              <div
                className={
                  "chat-filter-options grid [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:min-h-[44px] [&_label]:cursor-pointer [&_input]:w-[16px] [&_input]:h-[16px] [&_input]:m-0 [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&]:gap-[0_12px] [&&&&_label]:[overflow-wrap:anywhere] [&&&&_input]:shrink-[0] [&&&&_input]:[accent-color:var(--ors-color-accent)]"
                }
              >
                {chatChannels
                  .filter((entry) => entry.category === category.id)
                  .map((entry) => (
                    <label key={entry.kind}>
                      <input
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
        className={"chat-filter-count [&&&&]:[margin-left:auto]"}
        role="status"
        aria-live="polite"
      >
        {visibleCount} / {totalCount} 条
      </span>
    </div>
  );
}
