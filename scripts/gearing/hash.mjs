/** Stable content digests for downloaded inputs, owned rules, and generated artifacts. */
import { createHash } from "node:crypto";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
