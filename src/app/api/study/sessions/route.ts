import { NextResponse } from 'next/server';

import { getStudyJournal } from '@/lib/studyData';
import { getStudySessionUserId, unauthorizedStudyResponse } from '@/lib/studyRouteUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const sessions = await getStudyJournal(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    logger.error('Error fetching study sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch study sessions' }, { status: 500 });
  }
}
