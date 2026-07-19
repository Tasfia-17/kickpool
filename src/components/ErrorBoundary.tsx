'use client';

import React, { Component, ReactNode } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import PixelIcon from '@/components/PixelIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-red-200 dark:border-red-800 p-6 shadow-lg">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Oops! Something went wrong 😿
              </h2>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Don't worry, it happens to the best of us. The cats are working on it!
              </p>

              {/* Error details (collapsible in production) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-black/5 dark:bg-white/5 rounded-lg p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-red-600 dark:text-red-400">
                    Technical details
                  </summary>
                  <pre className="mt-2 overflow-auto max-h-32 text-gray-700 dark:text-gray-300">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <a
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper with hooks support
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Video-specific error boundary
export const VideoErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div style={{ color: '#ff69b4' }}><PixelIcon name="movie" size={64} /></div>
          <h3 className="text-xl font-bold text-white">Video Player Error</h3>
          <p className="text-gray-400 text-sm max-w-xs">
            The video player encountered an issue. Try refreshing or selecting a different video.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Chat-specific error boundary
export const ChatErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">💬</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chat temporarily unavailable</p>
          <button
            onClick={() => window.location.reload()}
            className="text-pink-500 text-sm hover:underline"
          >
            Reload
          </button>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
