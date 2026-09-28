/** Character identity, current PvP rotations, and the shared feature directory. */
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Aperture,
  ChatCircleDots,
  CoatHanger,
  FishSimple,
  MapTrifold,
  Sword,
  UsersThree,
} from "@phosphor-icons/react";
import type { AutoSignInStatus, LoginProfile } from "../features/auth/types";
import {
  getCrystallineConflictRotation,
  getFrontlineRotation,
  type PvpRotation,
} from "../shared/utils/pvpMap";
import "./HomePage.css";

type HomePageProps = {
  profile: LoginProfile | null;
  loginChecking: boolean;
  onOpenLogin: () => void;
  signInStatus: AutoSignInStatus;
  onRetrySignIn: () => void;
  onOpenRecruit: () => void;
  onOpenGlamour: () => void;
  onOpenTeleport: () => void;
  onOpenGearing: () => void;
  onOpenFishing: () => void;
  onOpenChat: () => void;
  onOpenPortrait: () => void;
};

export function HomePage({
  profile,
  loginChecking,
  onOpenLogin,
  signInStatus,
  onRetrySignIn,
  onOpenRecruit,
  onOpenGlamour,
  onOpenTeleport,
  onOpenGearing,
  onOpenFishing,
  onOpenChat,
  onOpenPortrait,
}: HomePageProps) {
  const [now, setNow] = useState(() => new Date());
  const nowMs = now.getTime();
  const frontline = getFrontlineRotation(now);
  const crystallineConflict = getCrystallineConflictRotation(now);
  const frontlineNextAt = frontline.nextRotationAt.getTime();
  const crystallineConflictNextAt =
    crystallineConflict.nextRotationAt.getTime();
  const characterName = profile?.characterName.trim();
  const serverName = profile?.groupName.trim();

  // Schedule the next render at the actual rotation boundary, then refresh
  // after the window resumes in case the system suspended the timer.
  useEffect(() => {
    const nextRotationAt = Math.min(frontlineNextAt, crystallineConflictNextAt);
    const timer = window.setTimeout(
      () => setNow(new Date()),
      Math.max(100, nextRotationAt - Date.now() + 100),
    );
    const refresh = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [nowMs, frontlineNextAt, crystallineConflictNextAt]);

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
    {
      name: "钓鱼数据库",
      description: "查询鱼类、钓获条件，记录钓鱼进度",
      icon: FishSimple,
      open: onOpenFishing,
    },
    {
      name: "手机聊天",
      description: "在手机查看游戏对话并发送普通聊天文字",
      icon: ChatCircleDots,
      open: onOpenChat,
    },
    {
      name: "肖像助手",
      description: "调整动作时间和肖像光照",
      icon: Aperture,
      open: onOpenPortrait,
    },
  ];
  return (
    <main className="product-home" id="top">
      <header className="home-identity">
        <h1>
          {characterName && serverName
            ? `${characterName}@${serverName}`
            : profile
              ? "角色信息不完整"
              : loginChecking
                ? "正在读取角色信息…"
                : "未登录角色"}
        </h1>
        {!profile && !loginChecking && (
          <button type="button" onClick={onOpenLogin}>
            登录后显示游戏 ID@服务器
          </button>
        )}
        {profile && (!characterName || !serverName) && (
          <p>当前账号未提供完整的游戏 ID 和服务器信息。</p>
        )}
        {profile && (
          <div className="home-signin" role="status">
            {signInStatus === "signed" || signInStatus === "already_signed" ? (
              <>
                <span aria-hidden="true">✅</span>
                <span>
                  {signInStatus === "signed"
                    ? "石之家自动签到成功"
                    : "石之家今日已签到"}
                </span>
              </>
            ) : signInStatus === "failed" ? (
              <>
                <span aria-hidden="true">❌</span>
                <span>石之家自动签到失败</span>
                <button type="button" onClick={onRetrySignIn}>
                  重试签到
                </button>
              </>
            ) : (
              <span>正在自动签到…</span>
            )}
          </div>
        )}
      </header>

      <section className="home-pvp" aria-labelledby="home-pvp-title">
        <h2 id="home-pvp-title">当前对战地图</h2>
        <div className="home-pvp-rotations">
          <PvpMapStatus title="纷争前线" rotation={frontline} />
          <PvpMapStatus title="水晶冲突" rotation={crystallineConflict} />
        </div>
        <p className="home-pvp-note">按 7.5 版本轮换规则推算</p>
      </section>

      <section className="home-tools" aria-labelledby="home-tools-title">
        <h2 id="home-tools-title">工具</h2>
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
      </section>
      <footer className="home-footer">非官方 FF14 工具</footer>
    </main>
  );
}

function PvpMapStatus({
  title,
  rotation,
}: {
  title: string;
  rotation: PvpRotation;
}) {
  const nextRotationLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(rotation.nextRotationAt);

  return (
    <div className="home-pvp-rotation">
      <h3>{title}</h3>
      <strong>{rotation.map.name}</strong>
      <time dateTime={rotation.nextRotationAt.toISOString()}>
        {nextRotationLabel} 轮换
      </time>
    </div>
  );
}
