/** Shared loading state for lazy application entrypoints and workspaces. */
import clsx from "clsx";
type LoadingPageProps = {
  message: string;
  fullscreen?: boolean;
  dark?: boolean;
};
export function LoadingPage({
  message,
  fullscreen = false,
  dark = false,
}: LoadingPageProps) {
  return (
    <div
      className={clsx(
        "loading-page grid place-items-center px-6 py-10 font-sans text-ink",
        // Embedded desktop states fill the workspace below its 56px context bar.
        fullscreen
          ? "loading-page--fullscreen app min-h-dvh w-full bg-canvas text-[15px] leading-relaxed"
          : "min-h-dvh min-[900px]:min-h-[calc(100dvh_-_56px)]",
        dark ? "theme-dark" : fullscreen && "theme-light",
      )}
      role="status"
    >
      <div className="loading-page__content grid max-w-full justify-items-center gap-5 text-center">
        <span
          className="loading-page__track block h-0.5 w-32 bg-line"
          aria-hidden="true"
        >
          <span className="loading-page__indicator block h-0.5 w-7 animate-[loading-page-scan_1.6s_ease-in-out_infinite] bg-accent" />
        </span>
        <p className="loading-page__message m-0 text-[15px] leading-[1.6] font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
