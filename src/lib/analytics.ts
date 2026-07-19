'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Privacy-friendly analytics that doesn't track personal data
 * - No cookies
 * - No fingerprinting
 * - Only aggregate data
 * - Compliant with GDPR/CCPA
 */

interface PageView {
  path: string;
  referrer: string;
  timestamp: number;
  screenWidth: number;
  screenHeight: number;
}

interface Event {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

// Queue for batching
const pageViewQueue: PageView[] = [];
const eventQueue: Event[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Flush to server
async function flush() {
  if (pageViewQueue.length === 0 && eventQueue.length === 0) return;
  
  const pageViews = [...pageViewQueue];
  const events = [...eventQueue];
  pageViewQueue.length = 0;
  eventQueue.length = 0;
  
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageViews, events }),
    });
  } catch {
    // Silent fail - analytics shouldn't break the app
  }
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flush();
  }, 10000); // Batch every 10 seconds
}

// Track page view
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  
  const pageView: PageView = {
    path,
    referrer: document.referrer || 'direct',
    timestamp: Date.now(),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
  
  pageViewQueue.push(pageView);
  scheduleFlush();
}

// Track custom event
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  const event: Event = {
    name,
    properties,
    timestamp: Date.now(),
  };
  
  eventQueue.push(event);
  scheduleFlush();
}

// React hook for automatic page view tracking
export function useAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');
  
  useEffect(() => {
    // Only track if path changed
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      trackPageView(pathname);
    }
  }, [pathname]);
  
  // Flush on unmount
  useEffect(() => {
    return () => {
      flush();
    };
  }, []);
  
  return { trackEvent };
}

// Predefined events
export const AnalyticsEvents = {
  // Room events
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  
  // Video events
  VIDEO_PLAYED: 'video_played',
  VIDEO_QUEUED: 'video_queued',
  
  // User events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  
  // Feature events
  CHAT_MESSAGE_SENT: 'chat_message',
  EMOJI_REACTION: 'emoji_reaction',
  THEME_CHANGED: 'theme_changed',
  
  // Achievement events
  BADGE_EARNED: 'badge_earned',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
};
