/**
 * 幻光集首页：负责穿搭检索、筛选、收藏与主题切换。
 * 当前数据为界面原型数据，后续可直接替换为石之家接口返回值。
 */
import { useMemo, useState } from 'react'
import {
  Bell, BookmarkSimple, CaretDown, Check, Heart, MagnifyingGlass,
  Moon, Plus, SlidersHorizontal, Sparkle, Sun, UserCircle, X,
} from '@phosphor-icons/react'
import './App.css'

type Glamour = {
  id: number
  title: string
  author: string
  race: string
  job: string
  palette: string
  image: string
  likes: number
  saved: number
  featured?: boolean
}

const GLAMOURS: Glamour[] = [
  { id: 1, title: '凛冬远行者', author: '白金幻象', race: '猫魅族 女性', job: '全职业', palette: '雾蓝', image: '/glamours/look-1.jpg', likes: 1286, saved: 462, featured: true },
  { id: 2, title: '萨雷安午后', author: '椴木书签', race: '猫魅族 女性', job: '治愈职业', palette: '灰黑', image: '/glamours/look-4.jpg', likes: 974, saved: 318 },
  { id: 3, title: '秋日裁缝札记', author: '薄荷泡芙', race: '敖龙族 女性', job: '全职业', palette: '燕麦', image: '/glamours/look-7.jpg', likes: 860, saved: 251 },
  { id: 4, title: '白银誓约', author: '伊修加德信使', race: '精灵族 女性', job: '防护职业', palette: '雪白', image: '/glamours/look-9.jpg', likes: 743, saved: 229, featured: true },
  { id: 5, title: '红月旅人', author: '南风诗笺', race: '人族 女性', job: '进攻职业', palette: '绯红', image: '/glamours/look-5.jpg', likes: 612, saved: 186 },
  { id: 6, title: '工房发条梦', author: '铜钟茶会', race: '拉拉菲尔族 女性', job: '魔法职业', palette: '棕褐', image: '/glamours/look-8.jpg', likes: 591, saved: 205 },
  { id: 7, title: '樱下夜行', author: '黑涡团裁缝', race: '维埃拉族 女性', job: '全职业', palette: '墨黑', image: '/glamours/look-6.jpg', likes: 534, saved: 172 },
  { id: 8, title: '暮庭学者', author: '星芒观测员', race: '猫魅族 女性', job: '魔法职业', palette: '靛蓝', image: '/glamours/scholar.jpg', likes: 488, saved: 139 },
]

const FILTERS = ['全部种族', '全部性别', '全部职业', '全部色系']

function App() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'推荐' | '关注'>('推荐')
  const [sort, setSort] = useState<'本周热门' | '最新发布'>('本周热门')
  const [saved, setSaved] = useState<number[]>([2, 6])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matched = GLAMOURS.filter((item) =>
      [item.title, item.author, item.race, item.job, item.palette]
        .join(' ').toLowerCase().includes(normalized),
    )
    return [...matched].sort((a, b) => sort === '本周热门' ? b.likes - a.likes : b.id - a.id)
  }, [query, sort])

  const toggleSave = (id: number) => {
    setSaved((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id])
  }

  return (
    <div className={dark ? 'app theme-dark' : 'app'}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="幻光集首页">
          <span className="brand-mark"><Sparkle weight="fill" /></span>
          <span><strong>幻光集</strong><small>EORZEA LOOKBOOK</small></span>
        </a>
        <nav className="main-nav" aria-label="主导航">
          <a className="active" href="#discover">发现</a>
          <a href="#wardrobe">衣橱</a>
          <a href="#collections">收藏夹</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label={dark ? '切换浅色主题' : '切换深色主题'} onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button>
          <button className="icon-button notification" type="button" aria-label="消息通知"><Bell /></button>
          <button className="profile-button" type="button"><UserCircle weight="duotone" /><span>浅色系</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" id="discover">
          <div className="hero-copy">
            <span className="eyebrow">冒险者穿搭档案</span>
            <h1>把灵感，<br />穿进艾欧泽亚。</h1>
            <p>按装备、种族与色彩寻找幻化，也把你的造型留给下一位冒险者。</p>
            <button className="primary-button" type="button"><Plus weight="bold" />发布我的幻化</button>
          </div>
          <div className="hero-image-wrap">
            <img src="/glamours/look-3.jpg" alt="身穿蓝色长衣的冒险者风格造型展示" />
            <div className="hero-caption"><span>本周编辑推荐</span><strong>来自伊修加德的冬日衣橱</strong></div>
          </div>
          <aside className="hero-index" aria-label="本周幻化数据">
            <span>WEEKLY ARCHIVE</span><strong>08 / 23</strong><p>本周收录 128 套新造型</p>
          </aside>
        </section>

        <section className="discovery-panel" aria-label="搜索和筛选">
          <div className="search-box">
            <MagnifyingGlass weight="bold" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索装备、作者或风格" aria-label="搜索幻化" />
            {query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}><X /></button>}
            <kbd>⌘ K</kbd>
          </div>
          <div className="filter-row">
            <div className="filter-label"><SlidersHorizontal />筛选</div>
            <div className="filter-scroll">
              {FILTERS.map((filter) => (
                <button className={activeFilter === filter ? 'filter-chip selected' : 'filter-chip'} type="button" key={filter} onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}>
                  {activeFilter === filter && <Check weight="bold" />}{filter}<CaretDown />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="gallery-section">
          <div className="gallery-toolbar">
            <div className="tab-list" role="tablist" aria-label="内容范围">
              {(['推荐', '关注'] as const).map((item) => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            <div className="result-count">找到 {results.length} 套造型</div>
            <div className="sort-control">
              {(['本周热门', '最新发布'] as const).map((item) => <button className={sort === item ? 'active' : ''} type="button" key={item} onClick={() => setSort(item)}>{item}</button>)}
            </div>
          </div>

          {results.length ? (
            <div className="glamour-grid">
              {results.slice(0, visibleCount).map((item, index) => (
                <article className="glamour-card" key={item.id} style={{ '--delay': `${index * 55}ms` } as React.CSSProperties}>
                  <div className="image-frame">
                    <img src={item.image} alt={`${item.title}幻化展示`} loading={index > 2 ? 'lazy' : 'eager'} />
                    <button className={saved.includes(item.id) ? 'save-button saved' : 'save-button'} type="button" aria-label={saved.includes(item.id) ? `取消收藏${item.title}` : `收藏${item.title}`} onClick={() => toggleSave(item.id)}><BookmarkSimple weight={saved.includes(item.id) ? 'fill' : 'regular'} /></button>
                  </div>
                  <div className="card-body">
                    <div className="card-heading"><h2>{item.title}</h2>{item.featured && <Sparkle weight="fill" aria-label="编辑精选" />}</div>
                    <p>{item.race}<span />{item.job}</p>
                    <div className="card-footer"><span>by {item.author}</span><span><Heart weight="fill" /> {item.likes}</span></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><MagnifyingGlass /><h2>没有找到对应造型</h2><p>试试缩短关键词，或搜索“治愈”“白色”等更常见的条件。</p><button type="button" onClick={() => setQuery('')}>清空搜索</button></div>
          )}
          {visibleCount < results.length && <button className="load-more" type="button" onClick={() => setVisibleCount((count) => count + 3)}>再看一些造型</button>}
        </section>
      </main>

      <footer className="site-footer">
        <div><strong>幻光集</strong><span>非官方 FF14 幻化概念站</span></div>
        <p>图片展示来自玩家社区公开作品，仅用于界面原型。</p>
      </footer>
    </div>
  )
}

export default App
