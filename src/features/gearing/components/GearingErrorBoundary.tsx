/** Keep a failed feature load recoverable without blanking the entire application. */
import { Component, type ReactNode, type ErrorInfo } from "react";
export class GearingErrorBoundary extends Component<
  { children: ReactNode; onGoHome: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
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
      <section className="gearing-load-error" role="alert">
        <h1>配装加载失败</h1>
        <p>请重新加载以读取完整的配装资源。已保存的配装不会被清除。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
        <button type="button" onClick={this.props.onGoHome}>
          返回首页
        </button>
      </section>
    );
  }
}
