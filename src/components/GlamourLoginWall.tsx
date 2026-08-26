/** Full-page authentication boundary for the protected glamour workspace. */
import {
  ArrowLeft,
  LockKey,
  ShieldCheck,
  UserCircleCheck,
} from "@phosphor-icons/react";

type GlamourLoginWallProps = {
  checking: boolean;
  expired: boolean;
  onLogin: () => void;
  onGoHome: () => void;
};

export function GlamourLoginWall({
  checking,
  expired,
  onLogin,
  onGoHome,
}: GlamourLoginWallProps) {
  return (
    <main className="glamour-login-wall" id="top">
      <section
        className="glamour-login-panel"
        aria-labelledby="glamour-login-title"
        aria-busy={checking}
      >
        <div className="glamour-login-seal" aria-hidden="true">
          <span>
            <LockKey weight="duotone" />
          </span>
          <small>SDO</small>
        </div>
        <div className="glamour-login-copy">
          <header>
            <span>{expired ? "登录状态已失效" : "需要石之家账号"}</span>
            <h1 id="glamour-login-title">
              {checking ? "正在确认登录状态" : "登录后浏览幻化"}
            </h1>
            <p>
              {expired
                ? "石之家会话已经失效。重新登录后会自动恢复幻化推荐与装备搜索。"
                : "幻化投稿和装备详情来自石之家。完成登录后才能读取推荐、搜索与详情。"}
            </p>
          </header>

          {checking ? (
            <div
              className="glamour-login-checking"
              aria-label="正在检查登录状态"
            >
              <span />
              <span />
              <small>正在验证本地会话</small>
            </div>
          ) : (
            <>
              <div className="glamour-login-assurance">
                <span>
                  <UserCircleCheck />
                  验证已绑定角色
                </span>
                <span>
                  <ShieldCheck />
                  登录凭据仅保存在本机
                </span>
              </div>
              <div className="glamour-login-actions">
                <button type="button" onClick={onLogin}>
                  <LockKey />
                  登录石之家
                </button>
                <button type="button" onClick={onGoHome}>
                  <ArrowLeft />
                  返回工具首页
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
