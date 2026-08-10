import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(
    error: Error,
  ): AppErrorBoundaryState {
    return {
      hasError: true,
      message:
        error.message ||
        "应用发生未知错误",
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ) {
    console.error(
      "GeoInsight application error:",
      error,
      info,
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-content">
          <h1>应用发生错误</h1>

          <p>
            GeoInsight AI
            在运行过程中出现异常。
          </p>

          <p>
            {this.state.message}
          </p>

          <button
            type="button"
            onClick={
              this.handleReload
            }
          >
            重新加载
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}