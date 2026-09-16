/** Searchable multi-source scope; an empty array means all sources, never an accidental empty set. */
import { useState } from "react";
export function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: { id: string; label: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = value.length
    ? new Set(value)
    : new Set(sources.map((s) => s.id));
  return (
    <details className="gear-source-picker">
      <summary>
        获取途径 ·{" "}
        {value.length
          ? `${sources.filter((s) => selected.has(s.id)).length} 项`
          : "全部"}
      </summary>
      <input
        aria-label="查找优化获取途径"
        placeholder="查找途径"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="gear-run">
        <button onClick={() => onChange([])}>全选</button>
        <button onClick={() => onChange(["none"])}>全不选</button>
      </div>
      {value.some(
        (id) => id !== "none" && !sources.some((source) => source.id === id),
      ) && (
        <p className="gear-muted">
          有已选途径不在当前品级范围内。调整品级或点击全选可重新选择。
        </p>
      )}
      <div className="gear-source-options">
        {!sources.some((source) => source.label.includes(search)) && (
          <p className="gear-muted">没有匹配的获取途径，请修改搜索词。</p>
        )}
        {sources
          .filter((s) => s.label.includes(search))
          .map((s) => (
            <label className="gear-check" key={s.id}>
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  next.delete("none");
                  if (e.target.checked) next.add(s.id);
                  else next.delete(s.id);
                  onChange(next.size ? [...next] : ["none"]);
                }}
              />
              {s.label}
            </label>
          ))}
      </div>
    </details>
  );
}
