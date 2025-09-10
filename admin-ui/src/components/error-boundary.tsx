"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const isNetworkError = error.message.toLowerCase().includes("network") || 
                        error.message.toLowerCase().includes("fetch");
  const isAuthError = error.message.toLowerCase().includes("unauthorized") ||
                     error.message.toLowerCase().includes("401");

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Alert className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isNetworkError
            ? "Connection Error"
            : isAuthError
            ? "Authentication Required"
            : "Something went wrong"}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            {isNetworkError
              ? "Unable to connect to the server. Please check your internet connection and try again."
              : isAuthError
              ? "Your session has expired. Please log in again to continue."
              : "An unexpected error occurred. Please try refreshing the page."}
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-muted-foreground">
                Technical details
              </summary>
              <pre className="mt-1 text-xs overflow-auto p-2 bg-muted rounded">
                {error.message}
              </pre>
            </details>
          )}
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          <Button onClick={reset} size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
          {isAuthError && (
            <Button
              onClick={() => (window.location.href = "/login")}
              variant="outline"
              size="sm"
            >
              Go to Login
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}