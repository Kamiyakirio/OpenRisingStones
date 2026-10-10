/** ET seconds run independently of the catalog and its one-second countdowns. */
import { useFishingClock } from "../hooks/useFishingClock";
import { EORZEA_HOUR } from "../utils/model";
export function FishClock() {
  const now = useFishingClock(100);
  const seconds = Math.floor((now / EORZEA_HOUR) * 3600) % 86400;
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return (
    <span className="fish-clock text-muted text-[13px] tabular-nums [&_strong]:ml-[7px] [&_strong]:text-ink [&_strong]:text-base">
      艾欧泽亚时间 <strong>{time}</strong>
    </span>
  );
}
