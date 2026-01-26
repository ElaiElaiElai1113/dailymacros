import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console (in production, this could go to a logging service)
    console.error("Error Boundary caught an error:", error, errorInfo);

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // You could also log to a service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left mb-6 p-4 bg-gray-50 rounded-lg">
                <summary className="text-xs font-semibold text-gray-700 cursor-pointer mb-2">
                  Error details (development only)
                </summary>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <span className="font-medium">Error:</span>{" "}
                    <code className="block mt-1 p-2 bg-white rounded border overflow-auto max-h-24">
                      {this.state.error.toString()}
                    </code>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <span className="font-medium">Component Stack:</span>{" "}
                      <pre className="block mt-1 p-2 bg-white rounded border overflow-auto max-h-32 text-[10px]">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D26E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B85C2E] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper component for convenience
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
