/** CLI guard for locally generated, untracked gearing data. */
import { checkGearingData } from "./gearing/check.mjs";

try {
  checkGearingData();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
