/** Featured glamour hero with archive context for the active filters. */
import { MagnifyingGlass } from "@phosphor-icons/react";
import { genderIdMap, raceIdMap } from "../models/idsToName";
import type { Glamour } from "../services/glamourApi";
import {
  formatGlamourCount,
  replaceBrokenImage,
} from "../utils/glamourPresentation";

type GlamourHeroProps = {
  featured: Glamour;
  total: number;
  raceId: number;
  genderId: number;
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
        <strong>{formatGlamourCount(total)}</strong>
        <p>
          {raceIdMap[raceId]} {genderIdMap[genderId]}投稿
        </p>
      </aside>
    </section>
  );
}
