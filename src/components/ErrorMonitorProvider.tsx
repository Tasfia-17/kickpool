'use client';

import { useErrorMonitor } from '@/lib/errorMonitor';
import { ReactNode } from 'react';

/**
 * Error Monitor Provider - captures unhandled errors globally
 * Provides automatic error reporting for debugging
 */
export function ErrorMonitorProvider({ children }: { children: ReactNode }) {
  // This hook sets up global error handlers
  useErrorMonitor();
  
  return <>{children}</>;
}

export default ErrorMonitorProvider;
