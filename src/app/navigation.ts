/** Maps application destinations and feature-owned section anchors to their workspace. */
export type ActiveFeature =
  | "home"
  | "glamour"
  | "recruit"
  | "teleport"
  | "gearing"
  | "gearing-benchmark"
  | "debug"
  | "fishing"
  | "chat"
  | "portrait"
  | "mentor";

const debugBuild = typeof __DEBUG_BUILD__ !== "undefined" && __DEBUG_BUILD__;

/** Workspace chrome always names the current destination, including deep links. */
export const workspaceNames: Record<ActiveFeature, string> = {
  home: "工具集",
  recruit: "招募",
  glamour: "幻化",
  teleport: "超域传送",
  gearing: "配装",
  fishing: "钓鱼数据库",
  chat: "手机聊天",
  portrait: "肖像助手",
  mentor: "导随记录",
  "gearing-benchmark": "配装性能测试",
  debug: "调试",
};

export function featureFromHash(
  hash: string,
  current: ActiveFeature = "home",
  allowDebugFeatures = debugBuild,
): ActiveFeature {
  const destination = hash.replace(/^#/, "");
  if (!destination || destination === "home") return "home";
  if (destination === "gearing-benchmark")
    return allowDebugFeatures ? "gearing-benchmark" : current;
  if (destination === "debug" || destination === "logs")
    return allowDebugFeatures ? "debug" : current;
  if (
    [
      "glamour",
      "recruit",
      "teleport",
      "gearing",
      "fishing",
      "chat",
      "portrait",
      "mentor",
    ].includes(destination)
  )
    return destination as ActiveFeature;
  if (destination.startsWith("teleport-")) return "teleport";
  if (
    ["discover", "recommendations", "wardrobe", "collections"].includes(
      destination,
    )
  )
    return "glamour";
  // A skip link or local section anchor must not select a different tool.
  return current;
}
