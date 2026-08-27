/** Static product attribution shown beneath a public data experience. */
export function SiteFooter({
  feature = "glamour",
}: {
  feature?: "glamour" | "recruit";
}) {
  const recruit = feature === "recruit";
  return (
    <footer className="site-footer">
      <div>
        <strong>{recruit ? "FFXIV RECRUIT" : "FFXIV GLAMOURS"}</strong>
        <span>
          {recruit ? "非官方 FF14 招募浏览器" : "非官方 FF14 幻化浏览器"}
        </span>
      </div>
      <p>
        {recruit
          ? "招募数据来自石之家公开招募列表。"
          : "投稿数据来自石之家公开幻化列表。"}
      </p>
    </footer>
  );
}
