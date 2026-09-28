/** Shared loading state for lazy application entrypoints and workspaces. */
import "./LoadingPage.css";

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
      className={`loading-page${fullscreen ? " loading-page--fullscreen app" : ""}${dark ? " theme-dark" : ""}`}
      role="status"
    >
      <div className="loading-page__content">
        <span className="loading-page__track" aria-hidden="true">
          <span className="loading-page__indicator" />
        </span>
        <p className="loading-page__message">{message}</p>
      </div>
    </div>
  );
}
