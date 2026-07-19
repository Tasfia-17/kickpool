import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStudyDashboard, syncLegacyStudyStreak } from '@/lib/studyData';
import {
  getStudySessionUserId,
  sanitizeStudyMultiline,
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
    const outcome = sanitizeStudyText(body?.outcome, 24).toLowerCase();

    if (!sessionId || !outcome) {
      return NextResponse.json({ error: 'Session id and outcome are required' }, { status: 400 });
    }

    const allowedOutcomes = ['done', 'partial', 'blocked', 'pivot'];
    if (!allowedOutcomes.includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
    }

    const actualFocusMinutes = toOptionalInt(body?.actualFocusMinutes) ?? 0;
    const actualBreakMinutes = toOptionalInt(body?.actualBreakMinutes) ?? 0;
    const completedCycles = toOptionalInt(body?.completedCycles) ?? 1;
    const interruptionCount = toOptionalInt(body?.interruptionCount) ?? 0;
    const debriefNote = sanitizeStudyMultiline(body?.debriefNote, 800) || null;
    const recoveryState = sanitizeStudyText(body?.recoveryState, 40) || 'settled';

    const session = await prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
        contractId: true,
        taskId: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Study session not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studySession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          outcome,
          debriefNote,
          actualFocusMinutes,
          actualBreakMinutes,
          completedCycles,
          interruptionCount,
          recoveryState,
        },
      });

      if (session.contractId) {
        await tx.studyContract.update({
          where: { id: session.contractId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      if (session.taskId) {
        await tx.studyTask.update({
          where: { id: session.taskId },
          data:
            outcome === 'done'
              ? {
                  status: 'DONE',
                  completedAt: new Date(),
                }
              : {
                  status: 'ACTIVE',
                },
        });
      }
    });

    await syncLegacyStudyStreak(userId);

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error completing study session:', error);
    return NextResponse.json({ error: 'Failed to complete study session' }, { status: 500 });
  }
}
