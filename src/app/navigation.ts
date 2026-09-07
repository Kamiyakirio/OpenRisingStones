/** Maps application destinations and feature-owned section anchors to their workspace. */
export type ActiveFeature =
  "home" | "glamour" | "recruit" | "teleport" | "gearing";

export function featureFromHash(
  hash: string,
  current: ActiveFeature = "home",
): ActiveFeature {
  const destination = hash.replace(/^#/, "");
  if (!destination || destination === "home") return "home";
  if (["glamour", "recruit", "teleport", "gearing"].includes(destination))
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
