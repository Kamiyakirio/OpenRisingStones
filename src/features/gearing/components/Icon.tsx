/** One bundled SVG sprite shares the original icon paths across the workspace. */
import icons from "../assets/icons.svg?url&no-inline";
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`gear-icon ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${icons}#gearing-${name.replaceAll("/", "-")}`} />
    </svg>
  );
}
