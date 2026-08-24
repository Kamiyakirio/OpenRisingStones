/** Product home with one available feature and two clearly disabled previews. */
import {
  ArrowUpRight,
  CoatHanger,
  GearSix,
  LockSimple,
  MapTrifold,
  Moon,
  Sparkle,
  Sun,
  UsersThree,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import "./HomePage.css";

type HomePageProps = {
  dark: boolean;
  onOpenGlamour: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
};

export function HomePage({
  dark,
  onOpenGlamour,
  onOpenSettings,
  onToggleTheme,
}: HomePageProps) {
  return (
    <main className="product-home" id="top">
      <header className="home-header">
        <a className="home-brand" href="#top" aria-label="OpenRisingStone 首页">
          <span className="home-brand-mark" aria-hidden="true">
            <Sparkle weight="fill" />
          </span>
          <strong>OpenRisingStone</strong>
        </a>
        <div className="home-header-actions">
          <button
            className="home-header-button"
            type="button"
            aria-label="打开设置"
            onClick={onOpenSettings}
          >
            <GearSix />
          </button>
          <button
            className="home-header-button"
            type="button"
            aria-label={dark ? "切换浅色主题" : "切换深色主题"}
            onClick={onToggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      <section className="home-intro" aria-labelledby="home-heading">
        <p className="home-kicker">冒险者工具集</p>
        <h1 id="home-heading">从这里，开启下一段旅程。</h1>
        <p>选择一项功能，整理角色形象与跨区冒险计划。</p>
      </section>

      <section className="feature-launcher" aria-label="应用功能">
        <FeatureTile
          icon={<UsersThree />}
          concept="recruit"
          name="招募"
          englishName="Recruit"
          description="寻找同行者，组织下一次冒险。"
          disabled
        />
        <FeatureTile
          icon={<CoatHanger />}
          concept="glamour"
          name="幻化"
          englishName="Glamour"
          description="浏览冒险者投稿，寻找你的下一套造型。"
          onClick={onOpenGlamour}
        />
        <FeatureTile
          icon={<MapTrifold />}
          concept="teleport"
          name="超域传送"
          englishName="Regional Teleport"
          description="规划跨区路线，快速抵达目的地。"
          disabled
        />
      </section>

      <footer className="home-footer">
        <span>为艾欧泽亚冒险者打造</span>
        <span>非官方社区工具</span>
      </footer>
    </main>
  );
}

type FeatureTileProps = {
  icon: ReactNode;
  concept: "recruit" | "glamour" | "teleport";
  name: string;
  englishName: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
};

/** Shared feature tile keeps all product entries visually equal. */
function FeatureTile({
  icon,
  concept,
  name,
  englishName,
  description,
  disabled = false,
  onClick,
}: FeatureTileProps) {
  return (
    <button
      className={`feature-tile ${disabled ? "feature-tile-disabled" : "feature-tile-available"}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <span className={`feature-concept concept-${concept}`} aria-hidden="true">
        <span className="concept-orbit" />
        <span className="concept-icon">{icon}</span>
      </span>
      <span className="feature-tile-content">
        <span className="feature-name">
          <strong>{name}</strong>
          <small>{englishName}</small>
        </span>
        <span className="feature-description">{description}</span>
        {disabled ? (
          <span className="feature-status">
            <LockSimple />
            暂未开放
          </span>
        ) : (
          <span className="feature-action" aria-hidden="true">
            进入
            <ArrowUpRight weight="bold" />
          </span>
        )}
      </span>
    </button>
  );
}
