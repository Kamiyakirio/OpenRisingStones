/** Compact, independent multi-select facets preserve the player's fishing intent. */
import { useMemo, useState } from "react";
import type { FishCatalog, FishFilters as Filters } from "./types";
import { patchGroup } from "./model";
import { kindLabels } from "./presentation";

function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="fish-filter-group">
      <legend>{label}</legend>
      <div className="fish-segments">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value.includes(id)}
            onClick={() =>
              onChange(
                value.includes(id)
                  ? value.filter((item) => item !== id)
                  : [...value, id],
              )
            }
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function FishFilters({
  catalog,
  filters,
  gameLogActive,
  onChange,
  onReset,
}: {
  catalog: FishCatalog;
  filters: Filters;
  gameLogActive: boolean;
  onChange: (change: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(
    () => window.matchMedia("(min-width: 601px)").matches,
  );
  const patches = useMemo(
    () => [...new Set(catalog.fish.map((fish) => patchGroup(fish.patch)))],
    [catalog],
  );
  const expansions = [
    ...new Set(
      patches
        .filter((p) => p !== "unknown")
        .map((p) => Number(p.split(".")[0])),
    ),
  ].sort((a, b) => b - a);
  const zones = useMemo(
    () =>
      [
        ...new Set(
          catalog.fish
            .flatMap((fish) => fish.locations.map((spot) => spot.zone))
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [catalog],
  );
  return (
    <details
      className="fish-filter-panel"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>筛选条件</summary>
      <div className="fish-filter-content">
        <fieldset className="fish-filter-group">
          <legend>版本</legend>
          <div className="fish-patches">
            {expansions.map((expansion) => {
              const group = patches
                .filter((p) => p.startsWith(`${expansion}.`))
                .sort();
              const selected = group.every((p) => filters.patches.includes(p));
              return (
                <div className="fish-patch-row" key={expansion}>
                  {Array.from(
                    { length: 6 },
                    (_, minor) => `${expansion}.${minor}`,
                  ).map((patch) => (
                    <button
                      key={patch}
                      disabled={!patches.includes(patch)}
                      aria-pressed={filters.patches.includes(patch)}
                      onClick={() =>
                        onChange({
                          patches: filters.patches.includes(patch)
                            ? filters.patches.filter((p) => p !== patch)
                            : [...filters.patches, patch],
                        })
                      }
                    >
                      {patch}
                    </button>
                  ))}
                  <button
                    aria-label={`${selected ? "取消" : "选择"} ${expansion}.x 全部版本`}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        patches: selected
                          ? filters.patches.filter((p) => !group.includes(p))
                          : [...new Set([...filters.patches, ...group])],
                      })
                    }
                  >
                    {expansion}.x
                  </button>
                </div>
              );
            })}
          </div>
          {patches.includes("unknown") && (
            <label className="fish-checkbox">
              <input
                type="checkbox"
                checked={filters.patches.includes("unknown")}
                onChange={(e) =>
                  onChange({
                    patches: e.target.checked
                      ? [...filters.patches, "unknown"]
                      : filters.patches.filter((p) => p !== "unknown"),
                  })
                }
              />
              版本未收录
            </label>
          )}
        </fieldset>
        <Choices
          label="水域"
          options={[
            ["world", "非海钓"],
            ["ocean", "海钓航次"],
          ]}
          value={filters.waters}
          onChange={(waters) => onChange({ waters })}
        />
        <Choices
          label="图鉴类别"
          options={Object.entries(kindLabels)}
          value={filters.kinds}
          onChange={(kinds) => onChange({ kinds })}
        />
        <Choices
          label="时间要求"
          options={[
            ["limited", "非全天 / 未知"],
            ["always", "全天"],
          ]}
          value={filters.restrictions}
          onChange={(restrictions) => onChange({ restrictions })}
        />
        <Choices
          label="完成状态"
          options={[
            ["caught", "已钓获"],
            ["uncaught", gameLogActive ? "未钓获" : "未标记"],
          ]}
          value={filters.completion}
          onChange={(completion) => onChange({ completion })}
        />
        <Choices
          label="钓法"
          options={[
            ["rod", "垂钓"],
            ["spear", "刺鱼"],
          ]}
          value={filters.methods}
          onChange={(methods) => onChange({ methods })}
        />
        <label className="fish-checkbox fish-eyes-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={filters.fishEyes}
            onChange={(e) => onChange({ fishEyes: e.target.checked })}
          />
          启用鱼眼计算
        </label>
        <p className="fish-filter-help">
          仅对支持鱼眼的鱼忽略时间限制；仍需满足天气并在游戏内使用技能。
        </p>
        <label className="fish-filter-select">
          区域
          <select
            value={filters.zone}
            onChange={(e) => onChange({ zone: e.target.value })}
          >
            <option value="">全部区域</option>
            {zones.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <label className="fish-filter-select">
          用途
          <select
            value={filters.kind}
            onChange={(e) => onChange({ kind: e.target.value })}
          >
            <option value="all">全部用途</option>
            <option value="collectable">收藏品</option>
            <option value="aquarium">水族箱鱼类</option>
          </select>
        </label>
        <label className="fish-checkbox">
          <input
            type="checkbox"
            checked={filters.progress === "saved"}
            onChange={(e) =>
              onChange({ progress: e.target.checked ? "saved" : "all" })
            }
          />
          仅看收藏
        </label>
        <label className="fish-checkbox">
          <input
            type="checkbox"
            checked={filters.available}
            onChange={(e) => onChange({ available: e.target.checked })}
          />
          仅看当前可钓
        </label>
        <button className="fish-reset" onClick={onReset}>
          重置筛选
        </button>
      </div>
    </details>
  );
}
