import { NextResponse } from 'next/server';

import { getStudyDashboard } from '@/lib/studyData';
import { getStudySessionUserId, unauthorizedStudyResponse } from '@/lib/studyRouteUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard.stats);
  } catch (error) {
    logger.error('Error fetching study stats:', error);
    return NextResponse.json({ error: 'Failed to fetch study stats' }, { status: 500 });
  }
}
