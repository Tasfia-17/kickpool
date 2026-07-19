import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStudyDashboard } from '@/lib/studyData';
import {
  getStudySessionUserId,
  sanitizeStudyText,
  toOptionalInt,
  unauthorizedStudyResponse,
} from '@/lib/studyRouteUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const body = await request.json();
    const sessionId = sanitizeStudyText(body?.sessionId, 64);
    if (!sessionId) {
      return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
    }

    const actualFocusMinutes = toOptionalInt(body?.actualFocusMinutes);
    const actualBreakMinutes = toOptionalInt(body?.actualBreakMinutes);
    const completedCycles = toOptionalInt(body?.completedCycles);
    const interruptionDelta = toOptionalInt(body?.interruptionDelta) ?? 0;
    const recoveryState = sanitizeStudyText(body?.recoveryState, 40) || undefined;

    await prisma.studySession.updateMany({
      where: {
        id: sessionId,
        userId,
        status: 'ACTIVE',
      },
      data: {
        ...(actualFocusMinutes !== null ? { actualFocusMinutes } : {}),
        ...(actualBreakMinutes !== null ? { actualBreakMinutes } : {}),
        ...(completedCycles !== null ? { completedCycles } : {}),
        ...(interruptionDelta ? { interruptionCount: { increment: interruptionDelta } } : {}),
        ...(recoveryState ? { recoveryState } : {}),
      },
    });

    if (interruptionDelta > 0) {
      await prisma.studySpace.update({
        where: { userId },
        data: {
          recoveryNudgeCount: {
            increment: 1,
          },
        },
      });
    }

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error updating study checkpoint:', error);
    return NextResponse.json({ error: 'Failed to update study checkpoint' }, { status: 500 });
  }
}
