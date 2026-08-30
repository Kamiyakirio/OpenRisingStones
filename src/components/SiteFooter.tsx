/** Static product attribution shown beneath a public data experience. */
export function SiteFooter({
  feature = "glamour",
}: {
  feature?: "glamour" | "recruit" | "teleport";
}) {
  const recruit = feature === "recruit";
  const teleport = feature === "teleport";
  return (
    <footer className="site-footer">
      <div>
        <strong>
          {teleport
            ? "FFXIV REGIONAL TELEPORT"
            : recruit
              ? "FFXIV RECRUIT"
              : "FFXIV GLAMOURS"}
        </strong>
        <span>
          {teleport
            ? "非官方 FF14 桌面读取工具"
            : recruit
              ? "非官方 FF14 招募浏览器"
              : "非官方 FF14 幻化浏览器"}
        </span>
      </div>
      <p>
        {teleport
          ? "角色和物品数据仅从本机游戏进程读取。"
          : recruit
            ? "招募数据来自石之家公开招募列表。"
            : "投稿数据来自石之家公开幻化列表。"}
      </p>
    </footer>
  );
}
