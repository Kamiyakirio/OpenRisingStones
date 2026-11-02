/** Keep a failed feature load recoverable without blanking the entire application. */
import { Component, type ReactNode, type ErrorInfo } from "react";

/** Complete utility strings are shared without adding component CSS rules. */
const gearingRecoveryActionClasses =
  "inline-flex min-h-9 items-center justify-center rounded-control border border-control bg-surface px-3 py-2 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover pointer-coarse:min-h-11";

export class GearingErrorBoundary extends Component<
  {
    children: ReactNode;
    onGoHome: () => void;
  },
  {
    failed: boolean;
  }
> {
  state = {
    failed: false,
  };
  static getDerivedStateFromError() {
    return {
      failed: true,
    };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Gearing workspace failed to render.",
      error,
      info.componentStack,
    );
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        className="gearing-load-error mx-auto grid w-full max-w-400 gap-3 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3"
        role="alert"
      >
        <h1 className="m-0 text-2xl font-bold tracking-tight">配装加载失败</h1>
        <p className="m-0 max-w-[65ch] text-muted">
          请重新加载以读取完整的配装资源。已保存的配装不会被清除。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className={gearingRecoveryActionClasses}
            type="button"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
          <button
            className={gearingRecoveryActionClasses}
            type="button"
            onClick={this.props.onGoHome}
          >
            返回首页
          </button>
        </div>
      </section>
    );
  }
}
