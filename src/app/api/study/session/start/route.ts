import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStudyRecipe } from '@/lib/study';
import { ensureStudySpace, getStudyDashboard } from '@/lib/studyData';
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
    const recipe = getStudyRecipe(sanitizeStudyText(body?.recipeId, 40));
    const sessionMinutes = toOptionalInt(body?.sessionMinutes) ?? recipe.focusMinutes;
    const energyMode = sanitizeStudyText(body?.energyMode, 24) || recipe.energyMode;
    const expectedOutcome = sanitizeStudyMultiline(body?.expectedOutcome, 260);
    const directTitle = sanitizeStudyText(body?.taskTitle, 140);
    const directDetails = sanitizeStudyMultiline(body?.taskDetails, 500) || null;
    const providedTaskId = sanitizeStudyText(body?.taskId, 64);

    if (!expectedOutcome) {
      return NextResponse.json(
        { error: 'Expected outcome is required to start a study session' },
        { status: 400 },
      );
    }

    const activeSession = await prisma.studySession.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: 'Finish the current study session before starting another one' },
        { status: 409 },
      );
    }

    const space = await ensureStudySpace(userId);

    await prisma.$transaction(async (tx) => {
      await tx.studyContract.updateMany({
        where: {
          userId,
          status: { in: ['DRAFT', 'ACTIVE'] },
        },
        data: {
          status: 'SUPERSEDED',
          completedAt: new Date(),
        },
      });

      await tx.studyTask.updateMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        data: {
          status: 'BACKLOG',
        },
      });

      let taskId = providedTaskId;

      if (taskId) {
        await tx.studyTask.updateMany({
          where: {
            id: taskId,
            userId,
          },
          data: {
            status: 'ACTIVE',
          },
        });
      } else if (directTitle) {
        const currentMax = await tx.studyTask.aggregate({
          where: { userId },
          _max: { position: true },
        });

        const task = await tx.studyTask.create({
          data: {
            userId,
            title: directTitle,
            details: directDetails,
            status: 'ACTIVE',
            priority: 'MEDIUM',
            energy: energyMode.toUpperCase(),
            taskType: 'focus',
            position: (currentMax._max.position ?? 0) + 1,
          },
        });
        taskId = task.id;
      }

      const contractTitle = directTitle || sanitizeStudyText(body?.title, 140) || 'Focus contract';
      const contract = await tx.studyContract.create({
        data: {
          userId,
          taskId: taskId || null,
          title: contractTitle,
          expectedOutcome,
          recipeId: recipe.id,
          energyMode,
          sessionMinutes,
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });

      await tx.studySession.create({
        data: {
          userId,
          contractId: contract.id,
          taskId: taskId || null,
          recipeId: recipe.id,
          recipeName: recipe.label,
          status: 'ACTIVE',
          energyMode,
          recoveryState: 'locked-in',
          sceneId: space.sceneId,
          plannedFocusMinutes: sessionMinutes,
          plannedBreakMinutes: recipe.breakMinutes,
        },
      });
    });

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error starting study session:', error);
    return NextResponse.json({ error: 'Failed to start study session' }, { status: 500 });
  }
}
