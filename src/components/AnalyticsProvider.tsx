'use client';

import { useAnalytics } from '@/lib/analytics';
import { ReactNode } from 'react';

/**
 * Analytics Provider - tracks page views automatically
 * Privacy-friendly: No cookies, no fingerprinting, aggregate data only
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  // This hook handles page view tracking automatically
  useAnalytics();
  
  return <>{children}</>;
}

export default AnalyticsProvider;
