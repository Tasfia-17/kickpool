import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminUser } from '@/lib/security';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  extra?: Record<string, unknown>;
}

// In-memory error store (use a real logging service in production)
const errorLogs: ErrorReport[] = [];
const MAX_STORED_ERRORS = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errors } = body as { errors: ErrorReport[] };

    if (!Array.isArray(errors)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    // Store errors (with limit)
    for (const error of errors) {
      errorLogs.push({
        ...error,
        timestamp: error.timestamp || Date.now(),
      });
    }

    // Keep only recent errors
    while (errorLogs.length > MAX_STORED_ERRORS) {
      errorLogs.shift();
    }

    // In production, you would send these to a logging service like:
    // - Sentry
    // - LogRocket
    // - Datadog
    // - Custom logging server

    // Log to console for now
    if (process.env.NODE_ENV === 'development') {
      errors.forEach(err => {
        logger.error('[Error Report]', err.message, err.url);
      });
    }

    return NextResponse.json({ received: errors.length });
  } catch (error) {
    logger.error('[Error API] Failed to process errors:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET endpoint for viewing errors (ADMIN ONLY)
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

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

  return NextResponse.json({
    total: errorLogs.length,
    errors: errorLogs.slice(-limit).reverse(),
  });
}
