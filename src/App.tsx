/**
 * FFXIV GLAMOURS 推荐页：读取石之家幻化列表，并提供筛选、搜索和收藏反馈。
 * 浏览器预览使用本地样例；Tauri 桌面端通过 Rust 网络层请求真实 API。
 */
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookmarkSimple,
  CaretDown,
  Heart,
  MagnifyingGlass,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Sun,
  UserCircle,
  UserCircleCheck,
  X,
} from "@phosphor-icons/react";
import { LoginDialog } from "./components/LoginDialog";
import { genderIdMap, raceIdMap } from "./models/idsToName";
import {
  fetchGlamours,
  isTauriRuntime,
  type Glamour,
  type GlamourOrder,
} from "./services/glamourApi";
import { getSdoLoginStatus, type LoginProfile } from "./services/sdoLogin";
import "./App.css";

const PREVIEW_GLAMOURS: Glamour[] = [
  {
    id: 1,
    title: "凛冬远行者",
    author: "白金幻象",
    race: "人族 男性",
    job: "全职业",
    palette: "雾蓝",
    image: "/glamours/look-1.jpg",
    likes: 1286,
    saved: 462,
    featured: true,
  },
  {
    id: 2,
    title: "萨雷安午后",
    author: "椴木书签",
    race: "人族 男性",
    job: "治愈职业",
    palette: "灰黑",
    image: "/glamours/look-4.jpg",
    likes: 974,
    saved: 318,
  },
  {
    id: 3,
    title: "秋日裁缝札记",
    author: "薄荷泡芙",
    race: "人族 男性",
    job: "全职业",
    palette: "燕麦",
    image: "/glamours/look-7.jpg",
    likes: 860,
    saved: 251,
  },
  {
    id: 4,
    title: "白银誓约",
    author: "伊修加德信使",
    race: "人族 男性",
    job: "防护职业",
    palette: "雪白",
    image: "/glamours/look-9.jpg",
    likes: 743,
    saved: 229,
  },
  {
    id: 5,
    title: "红月旅人",
    author: "南风诗笺",
    race: "人族 男性",
    job: "进攻职业",
    palette: "绯红",
    image: "/glamours/look-5.jpg",
    likes: 612,
    saved: 186,
  },
  {
    id: 6,
    title: "工房发条梦",
    author: "铜钟茶会",
    race: "人族 男性",
    job: "魔法职业",
    palette: "棕褐",
    image: "/glamours/look-8.jpg",
    likes: 591,
    saved: 205,
  },
  {
    id: 7,
    title: "樱下夜行",
    author: "黑涡团裁缝",
    race: "人族 男性",
    job: "全职业",
    palette: "墨黑",
    image: "/glamours/look-6.jpg",
    likes: 534,
    saved: 172,
  },
  {
    id: 8,
    title: "暮庭学者",
    author: "星芒观测员",
    race: "人族 男性",
    job: "魔法职业",
    palette: "靛蓝",
    image: "/glamours/scholar.jpg",
    likes: 488,
    saved: 139,
  },
];

const PAGE_SIZE = 12;
const FALLBACK_IMAGES = [
  "/glamours/look-1.jpg",
  "/glamours/look-4.jpg",
  "/glamours/look-7.jpg",
];

function App() {
  const preview = !isTauriRuntime();
  const [glamours, setGlamours] = useState<Glamour[]>(
    preview ? PREVIEW_GLAMOURS : [],
  );
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<GlamourOrder>("latest");
  const [raceId, setRaceId] = useState(1);
  const [genderId, setGenderId] = useState(1);
  const [saved, setSaved] = useState<number[]>([2, 6]);
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(preview ? PREVIEW_GLAMOURS.length : 0);
  const [loading, setLoading] = useState(!preview);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);

  useEffect(() => {
    void getSdoLoginStatus()
      .then((status) => setLoginProfile(status.profile))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (preview) return;
    let active = true;
    fetchGlamours({ page: 1, limit: PAGE_SIZE, order, raceId, genderId })
      .then((result) => {
        if (!active) return;
        setGlamours(result.items);
        setTotal(result.total);
        setPage(1);
      })
      .catch((reason: unknown) => {
        if (active) setError(readError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [genderId, order, preview, raceId, retryKey]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matched = glamours.filter((item) =>
      [item.title, item.author, item.race, item.job, item.palette]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
    if (!preview) return matched;
    return [...matched].sort((a, b) =>
      order === "hot" ? b.likes - a.likes : b.id - a.id,
    );
  }, [glamours, order, preview, query]);

  const featured = glamours[0] ?? PREVIEW_GLAMOURS[0];
  const canLoadMore = preview
    ? glamours.length < PREVIEW_GLAMOURS.length
    : glamours.length < total;

  const toggleSave = (id: number) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  /** 在筛选条件改变前切换加载状态，避免旧结果与新条件短暂混用。 */
  const updateFilter = (update: () => void) => {
    if (!preview) {
      setLoading(true);
      setError(null);
    }
    update();
  };

  const loadMore = async () => {
    if (preview || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const result = await fetchGlamours({
        page: nextPage,
        limit: PAGE_SIZE,
        order,
        raceId,
        genderId,
      });
      setGlamours((current) => [...current, ...result.items]);
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className={dark ? "app theme-dark" : "app"}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FFXIV GLAMOURS 首页">
          <span className="brand-mark">
            <Sparkle weight="fill" />
          </span>
          <span>
            <strong>FFXIV GLAMOURS</strong>
            <small>EORZEA LOOKBOOK</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="主导航">
          <a className="active" href="#discover">
            推荐
          </a>
          <a href="#wardrobe">衣橱</a>
          <a href="#collections">收藏夹</a>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={dark ? "切换浅色主题" : "切换深色主题"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button
            className="icon-button notification"
            type="button"
            aria-label="消息通知"
          >
            <Bell />
          </button>
          <button
            className={
              loginProfile ? "profile-button authenticated" : "profile-button"
            }
            type="button"
            onClick={() => setLoginOpen(true)}
          >
            {loginProfile ? <UserCircleCheck weight="fill" /> : <UserCircle />}
            {loginProfile
              ? loginProfile.characterName || loginProfile.displayAccount
              : "登录"}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" id="discover">
          <div className="hero-copy">
            <span className="eyebrow">今日幻化推荐</span>
            <h1>
              发现下一套
              <br />
              冒险者衣装。
            </h1>
            <p>从真实投稿中寻找装备组合、染色灵感与适合你的角色风格。</p>
            <a className="primary-button" href="#recommendations">
              <MagnifyingGlass weight="bold" />
              浏览最新投稿
            </a>
          </div>
          <div className="hero-image-wrap">
            <img
              src={featured.image}
              alt={`${featured.title}幻化展示`}
              onError={(event) => replaceBrokenImage(event.currentTarget, 0)}
            />
            <div className="hero-caption">
              <span>最新收录</span>
              <strong>{featured.title}</strong>
              <small>by {featured.author}</small>
            </div>
          </div>
          <aside className="hero-index" aria-label="幻化收录数据">
            <span>GLAMOUR ARCHIVE</span>
            <strong>{formatCount(total)}</strong>
            <p>
              {raceIdMap[raceId]} {genderIdMap[genderId]}投稿
            </p>
          </aside>
        </section>

        <section className="discovery-panel" aria-label="搜索和筛选">
          <div className="search-box">
            <MagnifyingGlass weight="bold" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、作者、职业或色系"
              aria-label="搜索幻化"
            />
            {query && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setQuery("")}
              >
                <X />
              </button>
            )}
            <kbd>⌘ K</kbd>
          </div>
          <div className="filter-row">
            <div className="filter-label">
              <SlidersHorizontal />
              筛选
            </div>
            <label className="filter-select">
              种族
              <select
                value={raceId}
                onChange={(event) =>
                  updateFilter(() => setRaceId(Number(event.target.value)))
                }
              >
                {Object.entries(raceIdMap).map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
              <CaretDown />
            </label>
            <label className="filter-select">
              性别
              <select
                value={genderId}
                onChange={(event) =>
                  updateFilter(() => setGenderId(Number(event.target.value)))
                }
              >
                {Object.entries(genderIdMap).map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
              <CaretDown />
            </label>
            <span className="data-source">
              {preview ? "预览数据" : "石之家实时数据"}
            </span>
          </div>
        </section>

        <section className="gallery-section" id="recommendations">
          <div className="gallery-toolbar">
            <div className="tab-list" role="tablist" aria-label="推荐排序">
              <button
                role="tab"
                aria-selected={order === "latest"}
                className={order === "latest" ? "active" : ""}
                type="button"
                onClick={() => updateFilter(() => setOrder("latest"))}
              >
                最新
              </button>
              <button
                role="tab"
                aria-selected={order === "hot"}
                className={order === "hot" ? "active" : ""}
                type="button"
                onClick={() => updateFilter(() => setOrder("hot"))}
              >
                热门
              </button>
            </div>
            <div className="result-count">
              {loading
                ? "正在读取投稿"
                : `已显示 ${results.length} / ${total} 套造型`}
            </div>
            <button className="publish-link" type="button">
              <Plus />
              发布幻化
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() =>
                  updateFilter(() => setRetryKey((key) => key + 1))
                }
              >
                重新加载
              </button>
            </div>
          )}

          {loading ? (
            <GlamourSkeleton />
          ) : results.length ? (
            <div className="glamour-grid">
              {results.map((item, index) => (
                <article
                  className="glamour-card"
                  key={item.id}
                  style={
                    { "--delay": `${index * 45}ms` } as React.CSSProperties
                  }
                >
                  <div className="image-frame">
                    <img
                      src={item.image}
                      alt={`${item.title}幻化展示`}
                      loading={index > 2 ? "lazy" : "eager"}
                      onError={(event) =>
                        replaceBrokenImage(event.currentTarget, index)
                      }
                    />
                    <button
                      className={
                        saved.includes(item.id)
                          ? "save-button saved"
                          : "save-button"
                      }
                      type="button"
                      aria-label={
                        saved.includes(item.id)
                          ? `取消收藏${item.title}`
                          : `收藏${item.title}`
                      }
                      onClick={() => toggleSave(item.id)}
                    >
                      <BookmarkSimple
                        weight={saved.includes(item.id) ? "fill" : "regular"}
                      />
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="card-heading">
                      <h2>{item.title}</h2>
                      {item.featured && (
                        <Sparkle weight="fill" aria-label="最新收录" />
                      )}
                    </div>
                    <p>
                      {item.race}
                      <span />
                      {item.job}
                      <span />
                      {item.palette}
                    </p>
                    <div className="card-footer">
                      <span>by {item.author}</span>
                      <span>
                        <Heart weight="fill" />{" "}
                        {item.likes.toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <MagnifyingGlass />
              <h2>暂时没有对应投稿</h2>
              <p>更换种族、性别或搜索词后再试一次。</p>
              <button type="button" onClick={() => setQuery("")}>
                清空搜索
              </button>
            </div>
          )}

          {canLoadMore && !loading && (
            <button
              className="load-more"
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "正在读取" : "加载更多投稿"}
            </button>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>FFXIV GLAMOURS</strong>
          <span>非官方 FF14 幻化浏览器</span>
        </div>
        <p>投稿数据来自石之家公开幻化列表。</p>
      </footer>
      {loginOpen && (
        <LoginDialog
          onClose={() => setLoginOpen(false)}
          onSuccess={setLoginProfile}
        />
      )}
    </div>
  );
}

function GlamourSkeleton() {
  return (
    <div className="glamour-grid skeleton-grid" aria-label="正在加载幻化投稿">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="glamour-card skeleton-card" key={index}>
          <div className="image-frame" />
          <span />
          <small />
        </div>
      ))}
    </div>
  );
}

function replaceBrokenImage(image: HTMLImageElement, index: number) {
  image.onerror = null;
  image.src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法读取石之家投稿，请稍后重试";
}

function formatCount(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}w`;
  return value.toLocaleString("zh-CN").padStart(2, "0");
}

export default App;
