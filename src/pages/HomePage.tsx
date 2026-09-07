/** Compact feature directory inside the shared application frame. */
import {
  ArrowRight,
  CoatHanger,
  MapTrifold,
  Sword,
  UsersThree,
} from "@phosphor-icons/react";
import "./HomePage.css";

type HomePageProps = {
  onOpenRecruit: () => void;
  onOpenGlamour: () => void;
  onOpenTeleport: () => void;
  onOpenGearing: () => void;
};

export function HomePage({
  onOpenRecruit,
  onOpenGlamour,
  onOpenTeleport,
  onOpenGearing,
}: HomePageProps) {
  const features = [
    {
      name: "招募",
      description: "按副本、职业和大区筛选招募",
      icon: UsersThree,
      open: onOpenRecruit,
    },
    {
      name: "幻化",
      description: "浏览幻化投稿，查看装备与染色",
      icon: CoatHanger,
      open: onOpenGlamour,
    },
    {
      name: "超域传送",
      description: "提交超域传送申请，查看订单状态",
      icon: MapTrifold,
      open: onOpenTeleport,
    },
    {
      name: "配装",
      description: "搭配装备与魔晶石，计算属性",
      icon: Sword,
      open: onOpenGearing,
    },
  ];
  return (
    <main className="product-home" id="top">
      <h1>工具</h1>
      <div className="feature-directory" aria-label="应用功能">
        {features.map(({ name, description, icon: Icon, open }) => (
          <button
            key={name}
            type="button"
            className="feature-entry"
            onClick={open}
          >
            <Icon className="feature-entry-icon" aria-hidden="true" />
            <strong>{name}</strong>
            <span className="feature-description">{description}</span>
            <span className="feature-entry-action" aria-hidden="true">
              <ArrowRight />
            </span>
          </button>
        ))}
      </div>
      <footer className="home-footer">非官方 FF14 工具</footer>
    </main>
  );
}
