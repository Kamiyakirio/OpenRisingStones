/** Keep generated game data local while making a fresh checkout actionable. */
import { readFileSync } from "node:fs";

try {
  const catalog = JSON.parse(
    readFileSync(
      new URL("../public/data/fishing/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  if (
    catalog.formatVersion !== 7 ||
    catalog.fish?.length < 1730 ||
    catalog.oceanRoutes?.length < 21 ||
    catalog.oceanRouteTable?.length !== 144 ||
    !catalog.oceanAvailability ||
    Object.keys(catalog.oceanMissionTypes ?? {}).length < 60 ||
    catalog.oceanRoutes.some(
      (route) =>
        route.stops?.length !== 3 || route.stops.some((stop) => !stop.name),
    ) ||
    !catalog.itemIcons ||
    catalog.fish.filter(
      (fish) =>
        Number.isInteger(fish.fishParameterId) ||
        Number.isInteger(fish.spearfishingItemId),
    ).length < 1700 ||
    catalog.fish.some(
      (fish) =>
        typeof fish.namePinyin !== "string" ||
        typeof fish.nameInitials !== "string" ||
        fish.locations.some((spot) => !spot.region || !spot.zone || !spot.name),
    )
  )
    throw new Error("Unsupported or incomplete fishing catalog.");
} catch (error) {
  console.error(
    `Fishing data is missing or invalid. Run:\nnpm run fishing:data:update\n${error.message}`,
  );
  process.exitCode = 1;
}
