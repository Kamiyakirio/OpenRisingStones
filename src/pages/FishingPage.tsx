/** Search-to-catch workflow in the shared application shell, usable without login. */
import { BookmarkSimple, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useRef } from "react";
import {
  FishDetail,
  FishIcon,
  WindowStatus,
} from "../features/fishing/FishDetail";
import { kindLabels, timeRequirement } from "../features/fishing/presentation";
import { WeatherRequirements } from "../features/fishing/Weather";
import { FishClock } from "../features/fishing/FishClock";
import { TimerLauncher } from "../features/fishing/timer/TimerLauncher";
import { FishFilters } from "../features/fishing/FishFilters";
import { initialFilters, useFishing } from "../features/fishing/useFishing";
import { useListDetailScroll } from "../shared/hooks/useListDetailScroll";
import "../features/fishing/fishing.css";

export function FishingPage() {
  const vm = useFishing();
  const { catalog, filters, progress } = vm;
  const scroll = useListDetailScroll(Boolean(vm.selected));
  const lastTrigger = useRef<number | null>(null);
  const caught =
    catalog?.fish.filter((fish) => progress.caught.includes(fish.id)).length ??
    0;
  function goBack() {
    scroll.requestListPositionRestore();
    vm.setSelectedId(null);
    requestAnimationFrame(() =>
      (
        document.getElementById(`fish-${lastTrigger.current}`) ??
        document.getElementById("fish-query")
      )?.focus({ preventScroll: true }),
    );
  }
  return (
    <main className="fishing-workspace" id="top">
      {vm.storageError && (
        <p role="alert">
          无法保存到本机，当前标记仅在本次页面中有效。请检查本地存储设置后重新标记。
        </p>
      )}
      {!catalog ? (
        <>
          <h1>钓鱼数据库</h1>
          {vm.error ? (
            <div role="alert">
              <p>鱼类数据加载失败，请重试。</p>
              <button onClick={vm.retry}>重新加载</button>
            </div>
          ) : (
            <p role="status">正在加载鱼类图鉴…</p>
          )}
        </>
      ) : vm.selected ? (
        <FishDetail
          key={`${vm.selected.id}:${filters.fishEyes}`}
          fishEyes={filters.fishEyes}
          fish={vm.selected}
          catalog={catalog}
          now={vm.now}
          progress={progress}
          onToggle={vm.toggleProgress}
          onBack={goBack}
        />
      ) : (
        <>
          <header className="fish-page-heading">
            <h1>钓鱼数据库</h1>
            <div className="fish-heading-tools">
              <TimerLauncher />
              <FishClock />
            </div>
          </header>
          <p className="fish-catalog-summary">
            图鉴共 {catalog.fish.length} 条 · 垂钓与刺鱼{" "}
            {catalog.fish.filter((fish) => fish.method !== "ocean").length} 条 ·
            海钓 {catalog.fish.filter((fish) => fish.method === "ocean").length}{" "}
            条
          </p>
          <div className="fish-browser-layout">
            <FishFilters
              catalog={catalog}
              filters={filters}
              onChange={vm.changeFilters}
              onReset={() => vm.changeFilters(initialFilters)}
            />
            <div className="fish-list-panel">
              <div className="fish-toolbar">
                <label className="fish-search" htmlFor="fish-query">
                  <span>搜索鱼类或钓点</span>
                  <span className="fish-search-input">
                    <MagnifyingGlass aria-hidden="true" />
                    <input
                      id="fish-query"
                      type="search"
                      value={filters.query}
                      placeholder="鱼名、英文名、物品 ID 或钓点"
                      onChange={(event) =>
                        vm.changeFilters({ query: event.target.value })
                      }
                    />
                  </span>
                </label>
                <label>
                  排序
                  <select
                    aria-label="排序"
                    value={filters.sort}
                    onChange={(event) =>
                      vm.changeFilters({
                        sort: event.target.value as typeof filters.sort,
                      })
                    }
                  >
                    <option value="window">窗口剩余 / 等待时间</option>
                    <option value="name">鱼名</option>
                    <option value="patch">版本：新到旧</option>
                    <option value="level">等级：高到低</option>
                  </select>
                </label>
              </div>
              <div className="fish-results-heading">
                <span className="fish-muted" role="status">
                  {vm.results.length} 条结果 · 已钓获 {caught} /{" "}
                  {catalog.fish.length}
                </span>
              </div>
              {vm.results.length ? (
                <>
                  <div className="fish-table-scroll">
                    <table className="fish-table">
                      <thead>
                        <tr>
                          <th scope="col">鱼类</th>
                          <th scope="col">区域 / 钓点</th>
                          <th scope="col">时间与天气</th>
                          <th scope="col">记录</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vm.results
                          .slice(vm.page * 40, (vm.page + 1) * 40)
                          .map((fish) => (
                            <tr
                              key={fish.id}
                              onClick={(event) => {
                                if (
                                  (event.target as HTMLElement).closest(
                                    ".fish-row-actions",
                                  )
                                )
                                  return;
                                lastTrigger.current = fish.id;
                                scroll.captureListPosition();
                                vm.setSelectedId(fish.id);
                              }}
                            >
                              <td>
                                <button
                                  id={`fish-${fish.id}`}
                                  className="fish-name-button"
                                  onClick={() => {
                                    lastTrigger.current = fish.id;
                                    scroll.captureListPosition();
                                    vm.setSelectedId(fish.id);
                                  }}
                                >
                                  <FishIcon fish={fish} />
                                  <span>
                                    <strong>{fish.name}</strong>
                                    <small>
                                      {kindLabels[fish.kind]}
                                      {fish.level != null
                                        ? ` · Lv. ${fish.level}`
                                        : ""}
                                    </small>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <span>{fish.zone || "区域未收录"}</span>
                                <small>
                                  {fish.locations[0]?.name || "具体钓点未收录"}
                                  {fish.locations.length > 1
                                    ? ` 等 ${fish.locations.length} 处`
                                    : ""}
                                </small>
                              </td>
                              <td>
                                <strong className="fish-time-requirement">
                                  {timeRequirement(fish)}
                                  {fish.method !== "ocean" &&
                                  timeRequirement(fish) !== "全天"
                                    ? " ET"
                                    : ""}
                                </strong>
                                <WeatherRequirements
                                  fish={fish}
                                  catalog={catalog}
                                />
                                <WindowStatus
                                  fish={fish}
                                  catalog={catalog}
                                  now={vm.now}
                                  fishEyes={filters.fishEyes}
                                />
                              </td>
                              <td>
                                <div className="fish-row-actions">
                                  <button
                                    aria-label={`${progress.saved.includes(fish.id) ? "取消收藏" : "收藏"}${fish.name}`}
                                    title="收藏"
                                    aria-pressed={progress.saved.includes(
                                      fish.id,
                                    )}
                                    onClick={() =>
                                      vm.toggleProgress(fish.id, "saved")
                                    }
                                  >
                                    <BookmarkSimple
                                      weight={
                                        progress.saved.includes(fish.id)
                                          ? "fill"
                                          : "regular"
                                      }
                                    />
                                  </button>
                                  <button
                                    aria-label={`${progress.caught.includes(fish.id) ? "取消已钓获" : "标记已钓获"}${fish.name}`}
                                    title="已钓获"
                                    aria-pressed={progress.caught.includes(
                                      fish.id,
                                    )}
                                    onClick={() =>
                                      vm.toggleProgress(fish.id, "caught")
                                    }
                                  >
                                    <Check
                                      weight={
                                        progress.caught.includes(fish.id)
                                          ? "bold"
                                          : "regular"
                                      }
                                    />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <nav className="fish-pagination" aria-label="鱼类列表分页">
                    <button
                      disabled={vm.page === 0}
                      onClick={() => {
                        vm.setPage(vm.page - 1);
                        document.getElementById("fish-query")?.focus();
                        window.scrollTo(0, 0);
                      }}
                    >
                      上一页
                    </button>
                    <span>
                      第 {vm.page + 1} / {Math.ceil(vm.results.length / 40)} 页
                    </span>
                    <button
                      disabled={(vm.page + 1) * 40 >= vm.results.length}
                      onClick={() => {
                        vm.setPage(vm.page + 1);
                        document.getElementById("fish-query")?.focus();
                        window.scrollTo(0, 0);
                      }}
                    >
                      下一页
                    </button>
                  </nav>
                </>
              ) : (
                <section className="fish-empty">
                  <h2>
                    {filters.progress === "saved"
                      ? "还没有符合条件的收藏"
                      : "没有符合条件的鱼类"}
                  </h2>
                  <p>试试其他鱼名、放宽条件，或清除筛选后浏览图鉴。</p>
                  <button onClick={() => vm.changeFilters(initialFilters)}>
                    清除筛选
                  </button>
                </section>
              )}
            </div>
          </div>
          <details className="fish-source">
            <summary>数据来源与覆盖范围</summary>
            <p>
              本地收录 {catalog.fish.length} 条图鉴，其中
              {
                catalog.fish.filter((fish) => fish.method !== "ocean").length
              }{" "}
              条垂钓与刺鱼记录可计算时间、天气窗口。海钓需结合航次判断。数据生成于{" "}
              {new Date(catalog.generatedAt).toLocaleDateString("zh-CN")}
              ，不代表覆盖当前版本全部鱼类。未收录的条件不视为无限制。
            </p>
            <p>
              图鉴与条件来自{" "}
              <a
                href="https://github.com/icykoneko/ff14-fish-tracker-app"
                target="_blank"
                rel="noreferrer"
              >
                FF14 Fish Tracker（MIT）
              </a>
              ，补充钓获资料来自{" "}
              <a
                href="https://github.com/ffxiv-teamcraft/ffxiv-teamcraft"
                target="_blank"
                rel="noreferrer"
              >
                Teamcraft（MIT）
              </a>
              ，中文名称、限制标记与钓点来自{" "}
              <a
                href="https://github.com/thewakingsands/ffxiv-datamining-cn"
                target="_blank"
                rel="noreferrer"
              >
                FFXIV 中文游戏数据
              </a>
              ；游戏图标通过 XIVAPI
              加载。收藏与钓获记录仅保存在本机，清除本地数据会删除记录。
            </p>
          </details>
        </>
      )}
    </main>
  );
}
