/** Brief source attribution shared by the data workspaces. */
export function SiteFooter({
  feature = "glamour",
  layout = "default",
}: {
  feature?: "glamour" | "recruit" | "teleport";
  layout?: "default" | "glamour-detail";
}) {
  return (
    <footer
      className={
        // Detail attribution follows the same width and responsive gutters as its main.
        `site-footer mx-auto flex w-full justify-between gap-3 py-5 text-xs text-muted max-[767px]:flex-wrap ${
          layout === "glamour-detail"
            ? "max-w-[1480px] px-5 max-[899px]:px-4 max-[519px]:px-3"
            : "max-w-[1280px] px-5 max-[767px]:px-4"
        }`
      }
    >
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
