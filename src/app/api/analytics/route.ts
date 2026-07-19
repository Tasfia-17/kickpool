import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminUser } from '@/lib/security';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

interface PageView {
  path: string;
  referrer: string;
  timestamp: number;
  screenWidth: number;
  screenHeight: number;
}

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

// Aggregate stats (no personal data stored)
interface AggregateStats {
  totalPageViews: number;
  pageViewsByPath: Record<string, number>;
  topReferrers: Record<string, number>;
  screenSizes: Record<string, number>;
  eventCounts: Record<string, number>;
  hourlyActivity: number[];
}

// In-memory stats (use Redis/database in production)
const stats: AggregateStats = {
  totalPageViews: 0,
  pageViewsByPath: {},
  topReferrers: {},
  screenSizes: {},
  eventCounts: {},
  hourlyActivity: new Array(24).fill(0),
};

// Reset stats daily
let lastReset = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function maybeReset() {
  if (Date.now() - lastReset > DAY_MS) {
    // Archive old stats here if needed
    stats.totalPageViews = 0;
    stats.pageViewsByPath = {};
    stats.topReferrers = {};
    stats.screenSizes = {};
    stats.eventCounts = {};
    stats.hourlyActivity = new Array(24).fill(0);
    lastReset = Date.now();
  }
}

function categorizeScreenSize(width: number): string {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function categorizeReferrer(referrer: string): string {
  if (!referrer || referrer === 'direct') return 'direct';

  try {
    const url = new URL(referrer);
    const host = url.hostname.replace('www.', '');

    // Categorize common referrers
    if (host.includes('google')) return 'google';
    if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
    if (host.includes('facebook')) return 'facebook';
    if (host.includes('reddit')) return 'reddit';
    if (host.includes('discord')) return 'discord';
    if (host.includes('youtube')) return 'youtube';

    return 'other';
  } catch {
    return 'unknown';
  }
}

export async function POST(request: NextRequest) {
  try {
    maybeReset();

    const body = await request.json();
    const { pageViews = [], events = [] } = body as {
      pageViews?: PageView[];
      events?: AnalyticsEvent[];
    };

    // Process page views (aggregate only)
    for (const pv of pageViews) {
      stats.totalPageViews++;

      // Count by path
      const path = pv.path.split('?')[0]; // Remove query params
      stats.pageViewsByPath[path] = (stats.pageViewsByPath[path] || 0) + 1;

      // Count by referrer category
      const referrerCategory = categorizeReferrer(pv.referrer);
      stats.topReferrers[referrerCategory] = (stats.topReferrers[referrerCategory] || 0) + 1;

      // Count by screen size category
      const screenCategory = categorizeScreenSize(pv.screenWidth);
      stats.screenSizes[screenCategory] = (stats.screenSizes[screenCategory] || 0) + 1;

      // Track hourly activity
      const hour = new Date(pv.timestamp).getHours();
      stats.hourlyActivity[hour]++;
    }

    // Process events (aggregate only)
    for (const event of events) {
      stats.eventCounts[event.name] = (stats.eventCounts[event.name] || 0) + 1;
    }

    return NextResponse.json({ received: pageViews.length + events.length });
  } catch (error) {
    logger.error('[Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET stats (ADMIN ONLY)
export async function GET(request: NextRequest) {
  // Security: Require admin authentication
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const isAdmin = isAdminUser((session.user as any).role);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  maybeReset();

  return NextResponse.json({
    period: 'today',
    stats: {
      ...stats,
      // Sort and limit top pages
      topPages: Object.entries(stats.pageViewsByPath)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, views]) => ({ path, views })),
    },
  });
}
