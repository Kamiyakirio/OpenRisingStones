/** Brief source attribution shared by the data workspaces. */
export function SiteFooter({
  feature = "glamour",
}: {
  feature?: "glamour" | "recruit" | "teleport";
}) {
  return (
    <footer className="site-footer">
      <span>非官方 FF14 工具</span>
      <span>
        {feature === "teleport"
          ? "超域传送服务由盛趣提供"
          : feature === "recruit"
            ? "招募数据来自石之家"
            : "幻化投稿来自石之家"}
      </span>
    </footer>
  );
}
