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
    catalog.formatVersion !== 2 ||
    catalog.fish?.length < 1730 ||
    !catalog.itemIcons
  )
    throw new Error("Unsupported or incomplete fishing catalog.");
} catch (error) {
  console.error(
    `Fishing data is missing or invalid. Run:\nnpm run fishing:data:update\n${error.message}`,
  );
  process.exitCode = 1;
}
