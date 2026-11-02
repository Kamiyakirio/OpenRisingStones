/** Character identity, current PvP rotations, and the shared feature directory. */
import { featureColorClasses } from "../shared/styles/workspaceColors";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Aperture,
  ChatCircleDots,
  CoatHanger,
  FishSimple,
  MapTrifold,
  ClipboardText,
  Sword,
  UsersThree,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AutoSignInStatus, LoginProfile } from "../features/auth/types";
import {
  getCrystallineConflictRotation,
  getFrontlineRotation,
  formatPvpCountdown,
  pvpMapImageUrl,
  type PvpMap,
  type PvpRotation,
} from "../shared/utils/pvpMap";
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
  onOpenMentor: () => void;
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
  onOpenMentor,
}: HomePageProps) {
  const [query, setQuery] = useState("");
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
      id: "recruit",
      name: "招募",
      description: "按副本、职业和大区筛选招募",
      icon: UsersThree,
      open: onOpenRecruit,
    },
    {
      id: "glamour",
      name: "幻化",
      description: "浏览幻化投稿，查看装备与染色",
      icon: CoatHanger,
      open: onOpenGlamour,
    },
    {
      id: "teleport",
      name: "超域传送",
      description: "提交超域传送申请，查看订单状态",
      icon: MapTrifold,
      open: onOpenTeleport,
    },
    {
      id: "gearing",
      name: "配装",
      description: "搭配装备与魔晶石，计算属性",
      icon: Sword,
      open: onOpenGearing,
    },
    {
      id: "fishing",
      name: "钓鱼数据库",
      description: "查询鱼类、钓获条件，记录钓鱼进度",
      icon: FishSimple,
      open: onOpenFishing,
    },
    {
      id: "chat",
      name: "手机聊天",
      description: "在手机查看游戏对话并发送普通聊天文字",
      icon: ChatCircleDots,
      open: onOpenChat,
    },
    {
      id: "portrait",
      name: "肖像助手",
      description: "调整动作时间和肖像光照",
      icon: Aperture,
      open: onOpenPortrait,
    },
    {
      id: "mentor",
      name: "导随记录",
      description: "自动记录指导者随机任务，区分完成与退出",
      icon: ClipboardText,
      open: onOpenMentor,
    },
  ];
  return (
    <main
      className="product-home mx-auto min-h-[calc(100dvh-56px)] w-full max-w-400 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4"
      id="top"
    >
      <header className="home-heading mb-5 flex flex-wrap items-center justify-between gap-3 max-[619px]:mb-5 max-[619px]:gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">所有工具</h1>
          <p className="mt-1 text-sm text-muted">
            选择需要的工具，开始当前任务。
          </p>
        </div>
        <label className="home-search flex h-11 w-full max-w-80 items-center gap-3 rounded-control border border-control bg-surface px-3 focus-within:border-accent max-[619px]:max-w-none">
          <MagnifyingGlass
            className="size-5 shrink-0 text-muted"
            aria-hidden="true"
          />
          <span className="sr-only">搜索工具</span>
          <input
            className="min-h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none pointer-coarse:min-h-11"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索工具"
          />
        </label>
      </header>
      <div className="home-layout grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1199px]:grid-cols-[minmax(0,1fr)_280px] max-[1199px]:gap-4 max-[1099px]:grid-cols-1">
        <section
          className="home-tools min-w-0"
          aria-labelledby="home-tools-title"
        >
          <h2
            className="mb-3 text-sm font-semibold text-muted"
            id="home-tools-title"
          >
            工具
          </h2>
          <div
            className="feature-directory overflow-hidden rounded-panel border border-line bg-surface"
            aria-label="应用功能"
          >
            {features
              .filter(({ name, description }) =>
                `${name} ${description}`.includes(query.trim()),
              )
              .map(({ id, name, description, icon: Icon, open }) => (
                <button
                  key={id}
                  data-feature={id}
                  type="button"
                  className={clsx(
                    "feature-entry flex min-h-16 w-full items-center gap-3 border-0 border-b border-line px-4 py-3 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] last:border-b-0 hover:bg-hover focus-visible:relative focus-visible:z-1 focus-visible:outline-offset-[-3px] max-[619px]:gap-3 max-[619px]:px-4",
                    featureColorClasses,
                  )}
                  onClick={open}
                >
                  <span className="feature-entry-symbol grid size-9 shrink-0 place-items-center rounded-control border border-[color-mix(_in_srgb,_var(--tool-color)_18%,_var(--ors-color-line)_)] bg-[color-mix(_in_srgb,_var(--tool-color)_4%,_var(--ors-color-surface)_)] text-tool max-[619px]:size-9">
                    <Icon
                      className="size-5 shrink-0 text-tool"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="feature-entry-copy flex min-w-0 flex-1 flex-col gap-1">
                    <strong className="text-base font-semibold text-ink">
                      {name}
                    </strong>
                    <span className="feature-description text-sm text-muted max-[619px]:text-xs max-[619px]:leading-relaxed">
                      {description}
                    </span>
                  </span>
                  <ArrowRight
                    className="feature-entry-action size-5 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </button>
              ))}
            {features.every(
              ({ name, description }) =>
                !`${name} ${description}`.includes(query.trim()),
            ) && (
              <p
                className="home-empty px-5 py-10 text-center text-sm text-muted"
                role="status"
              >
                没有匹配的工具，请换个关键词。
              </p>
            )}
          </div>
        </section>
        <aside
          className="home-context grid min-w-0 gap-3 max-[1099px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] max-[619px]:grid-cols-1"
          aria-label="角色与对战信息"
        >
          <header className="home-identity rounded-panel border border-line bg-surface p-4">
            <h2 className="text-base font-semibold break-words">
              {characterName && serverName
                ? `${characterName}@${serverName}`
                : profile
                  ? "角色信息不完整"
                  : loginChecking
                    ? "正在读取角色信息…"
                    : "未登录角色"}
            </h2>
            {!profile && !loginChecking && (
              <button
                className="mt-3 min-h-9 rounded-control border border-control px-3 py-2 text-sm text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover pointer-coarse:min-h-11"
                type="button"
                onClick={onOpenLogin}
              >
                登录后显示游戏 ID@服务器
              </button>
            )}
            {profile && (!characterName || !serverName) && (
              <p className="mt-1 text-sm text-muted">
                当前账号未提供完整的游戏 ID 和服务器信息。
              </p>
            )}
            {profile && (
              <div
                className="home-signin mt-3 flex flex-wrap items-center gap-2 text-xs text-muted"
                role="status"
              >
                {signInStatus === "signed" ||
                signInStatus === "already_signed" ? (
                  <>
                    <CheckCircle className="size-4" aria-hidden="true" />
                    <span>
                      {signInStatus === "signed"
                        ? "石之家自动签到成功"
                        : "石之家今日已签到"}
                    </span>
                  </>
                ) : signInStatus === "failed" ? (
                  <>
                    <WarningCircle className="size-4" aria-hidden="true" />
                    <span>石之家自动签到失败</span>
                    <button
                      className="m-0 min-h-9 rounded-control border border-control px-3 py-2 text-sm text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover pointer-coarse:min-h-11"
                      type="button"
                      onClick={onRetrySignIn}
                    >
                      重试签到
                    </button>
                  </>
                ) : (
                  <span>正在自动签到…</span>
                )}
              </div>
            )}
          </header>

          <section
            className="home-pvp overflow-hidden rounded-panel border border-line bg-surface"
            aria-labelledby="home-pvp-title"
          >
            <h2
              className="border-b border-line px-4 py-3 text-sm font-semibold"
              id="home-pvp-title"
            >
              当前对战地图
            </h2>
            <div className="home-pvp-rotations grid max-[1099px]:grid-cols-2 max-[619px]:grid-cols-1">
              <PvpMapStatus title="纷争前线" rotation={frontline} />
              <PvpMapStatus title="水晶冲突" rotation={crystallineConflict} />
            </div>
          </section>
        </aside>
      </div>
      <footer className="home-footer mt-4 text-xs text-muted">
        非官方 FF14 工具
      </footer>
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
    <div className="home-pvp-rotation flex min-w-0 flex-col gap-2 border-b border-line p-4 last:border-b-0 max-[1099px]:border-b-0 max-[1099px]:not-first:border-l max-[1099px]:not-first:border-line max-[619px]:not-first:border-t max-[619px]:not-first:border-l-0 max-[619px]:not-first:border-line">
      <h3 className="text-xs font-semibold text-muted">{title}</h3>
      <PvpMapArtwork key={rotation.map.imageId} map={rotation.map} />
      <strong className="text-base font-semibold">{rotation.map.name}</strong>
      <PvpCountdown nextRotationAt={rotation.nextRotationAt} />
      <time
        className="text-xs text-muted"
        dateTime={rotation.nextRotationAt.toISOString()}
      >
        下次轮换 {nextRotationLabel}
      </time>
    </div>
  );
}
function PvpCountdown({ nextRotationAt }: { nextRotationAt: Date }) {
  const [nowMs, setNowMs] = useState(Date.now);
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    let timer: number | undefined = document.hidden
      ? undefined
      : window.setInterval(update, 1_000);
    const syncVisibility = () => {
      window.clearInterval(timer);
      if (!document.hidden) {
        update();
        timer = window.setInterval(update, 1_000);
      }
    };
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("focus", update);
    };
  }, []);
  return (
    <span className="home-pvp-countdown text-sm font-semibold tabular-nums">
      距离轮换 {formatPvpCountdown(nextRotationAt.getTime() - nowMs)}
    </span>
  );
}
function PvpMapArtwork({ map }: { map: PvpMap }) {
  const [source, setSource] = useState<"mirror" | "official" | "unavailable">(
    "mirror",
  );
  if (source === "unavailable") {
    return (
      <div className="home-pvp-artwork home-pvp-artwork-fallback my-1 grid aspect-[47/15] w-full place-items-center rounded-control border border-line bg-hover object-cover px-4 text-center text-xs text-muted">
        地图图片暂不可用
      </div>
    );
  }
  return (
    <img
      className="home-pvp-artwork my-1 block aspect-[47/15] w-full rounded-control border border-line bg-hover object-cover"
      src={pvpMapImageUrl(map, source)}
      alt=""
      loading="eager"
      decoding="async"
      onError={() =>
        setSource((current) =>
          current === "mirror" ? "official" : "unavailable",
        )
      }
    />
  );
}
