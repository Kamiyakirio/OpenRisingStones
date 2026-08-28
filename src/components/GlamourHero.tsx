/** Featured glamour hero with archive context for the active filters. */
import { MagnifyingGlass } from "@phosphor-icons/react";
import { genderIdMap, raceIdMap } from "../models/idsToName";
import type { Glamour } from "../models/glamour";
import { formatGlamourCount } from "../utils/glamourPresentation";

type GlamourHeroProps = {
  featured: Glamour;
  total: number;
  raceId: number | null;
  genderId: number | null;
};

export function GlamourHero({
  featured,
  total,
  raceId,
  genderId,
}: GlamourHeroProps) {
  return (
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
      <aside className="hero-overview" aria-label="幻化收录概览">
        <div className="archive-total">
          <span>GLAMOUR ARCHIVE</span>
          <strong>{formatGlamourCount(total)}</strong>
          <small>套已载入的造型</small>
        </div>
        <div className="latest-entry">
          <span>最新收录</span>
          <strong>{featured.title}</strong>
          <p>by {featured.author}</p>
        </div>
        <dl className="hero-meta">
          <div>
            <dt>当前筛选</dt>
            <dd>
              {raceId === null ? "不限种族" : raceIdMap[raceId]} ·{" "}
              {genderId === null ? "不限性别" : genderIdMap[genderId]}
            </dd>
          </div>
          <div>
            <dt>灵感来源</dt>
            <dd>冒险者真实投稿</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}
