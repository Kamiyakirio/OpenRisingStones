/** Maps application destinations and feature-owned section anchors to their workspace. */
export type ActiveFeature =
  | "home"
  | "glamour"
  | "recruit"
  | "teleport"
  | "gearing"
  | "gearing-benchmark"
  | "fishing";

const debugBuild = typeof __DEBUG_BUILD__ !== "undefined" && __DEBUG_BUILD__;

export function featureFromHash(
  hash: string,
  current: ActiveFeature = "home",
  allowDebugFeatures = debugBuild,
): ActiveFeature {
  const destination = hash.replace(/^#/, "");
  if (!destination || destination === "home") return "home";
  if (destination === "gearing-benchmark")
    return allowDebugFeatures ? "gearing-benchmark" : current;
  if (
    ["glamour", "recruit", "teleport", "gearing", "fishing"].includes(
      destination,
    )
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
