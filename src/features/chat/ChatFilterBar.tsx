/** Shared checkbox filters; native popover keeps the controls outside the scrolling ledger. */
import { useId, useState } from "react";
import {
  chatCategories,
  chatChannels,
  isChatCategorySelected,
  matchesChatFilters,
  toggleChatFilter,
  type ChatFilter,
} from "./channels";
import "./ChatDisplay.css";

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
    <div className="chat-filter-bar">
      <span>筛选</span>
      <button
        type="button"
        className="chat-filter-trigger"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
      >
        {value.length === 0 ? "全部消息" : `已选 ${value.length} 项`}
        <span aria-hidden="true">⌄</span>
      </button>
      <div
        id={id}
        popover="auto"
        className="chat-filter-popup"
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
        <div className="chat-filter-options">
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
        <details className="chat-filter-channels">
          <summary>具体频道</summary>
          {chatCategories.slice(0, 4).map((category) => (
            <fieldset key={category.id}>
              <legend>{category.label}</legend>
              <div className="chat-filter-options">
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
      <span className="chat-filter-count" role="status" aria-live="polite">
        {visibleCount} / {totalCount} 条
      </span>
    </div>
  );
}
