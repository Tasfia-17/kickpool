'use client';

import { useEffect, useCallback } from 'react';

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

// Error queue for batching
const errorQueue: ErrorInfo[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Flush errors to server (batched)
async function flushErrors() {
  if (errorQueue.length === 0) return;

  const errors = [...errorQueue];
  errorQueue.length = 0;

  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors }),
    });
  } catch (e) {
    // Don't throw - error reporting shouldn&apos;t break the app
    console.warn('[ErrorMonitor] Failed to send errors:', e);
  }
}

// Schedule flush
function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushErrors();
  }, 5000); // Batch every 5 seconds
}

// Core error capture function
export function captureError(
  error: Error | string,
  extra?: Record<string, unknown>
): void {
  const errorInfo: ErrorInfo = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    extra,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorMonitor]', errorInfo);
  }

  errorQueue.push(errorInfo);
  scheduleFlush();
}

// Capture message (non-error)
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: Record<string, unknown>
): void {
  captureError(message, { ...extra, level });
}

// React Error Boundary hook
export function useErrorMonitor() {
  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      captureError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      captureError(
        event.reason?.message || 'Unhandled Promise Rejection',
        { reason: String(event.reason) }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Return manual capture functions
  return { captureError, captureMessage };
}

// HOC for wrapping components with error boundary logging
export function withErrorMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function ErrorMonitoredComponent(props: P) {
    const { captureError } = useErrorMonitor();

    useEffect(() => {
      // Log component mount for debugging
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[ErrorMonitor] ${componentName} mounted`);
      }
    }, []);

    return <WrappedComponent {...props} />;
  };
}

// Performance monitoring
export function measurePerformance(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      if (duration > 1000) {
        captureMessage(`Slow operation: ${name}`, 'warning', { duration });
      }
    });
  }

  const duration = performance.now() - start;
  if (duration > 1000) {
    captureMessage(`Slow operation: ${name}`, 'warning', { duration });
  }
}
