import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ensureStudySpace, getStudyDashboard, syncLegacyStudyStreak } from '@/lib/studyData';
import { getStudyRecipe } from '@/lib/study';
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
    const space = await ensureStudySpace(userId);
    const existingCount = await prisma.studyTask.count({ where: { userId } });
    const existingSessions = await prisma.studySession.count({ where: { userId } });

    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const sessions = Array.isArray(body?.sessions) ? body.sessions : [];
    const scratchpad = sanitizeStudyMultiline(body?.scratchpad, 4000);
    const parkingLot = Array.isArray(body?.parkingLot)
      ? body.parkingLot.map((entry: unknown) => sanitizeStudyText(entry, 180)).filter(Boolean)
      : [];

    await prisma.$transaction(async (tx) => {
      if (!space.lastLegacyImportAt) {
        await tx.studySpace.update({
          where: { userId },
          data: {
            scratchpad: scratchpad || space.scratchpad,
            parkingLot: parkingLot.length ? parkingLot : space.parkingLot,
            lastLegacyImportAt: new Date(),
          },
        });
      }

      if (!existingCount && tasks.length) {
        let position = 0;
        for (const rawTask of tasks.slice(0, 24)) {
          const title = sanitizeStudyText(rawTask?.text ?? rawTask?.title, 140);
          if (!title) continue;

          await tx.studyTask.create({
            data: {
              userId,
              title,
              details: sanitizeStudyMultiline(rawTask?.details, 500) || null,
              status: rawTask?.completed ? 'DONE' : 'BACKLOG',
              priority: sanitizeStudyText(rawTask?.priority, 16).toUpperCase() || 'MEDIUM',
              energy: 'STEADY',
              taskType: 'legacy',
              position,
              completedAt: rawTask?.completed ? new Date() : null,
            },
          });
          position += 1;
        }
      }

      if (!existingSessions && sessions.length) {
        for (const rawSession of sessions.slice(0, 24)) {
          const duration = toOptionalInt(rawSession?.duration) ?? 0;
          const pomodoros = toOptionalInt(rawSession?.pomodoros) ?? 0;
          const recipe = getStudyRecipe(
            pomodoros > 1 ? 'deep-reading' : duration <= 10 ? 'ignition' : 'memorization',
          );
          const startedAt = rawSession?.startTime ? new Date(rawSession.startTime) : new Date();
          const endedAt = rawSession?.endTime ? new Date(rawSession.endTime) : startedAt;

          await tx.studySession.create({
            data: {
              userId,
              recipeId: recipe.id,
              recipeName: recipe.label,
              status: 'COMPLETED',
              energyMode: recipe.energyMode,
              sceneId: space.sceneId,
              startedAt,
              endedAt,
              plannedFocusMinutes: recipe.focusMinutes,
              actualFocusMinutes: duration,
              plannedBreakMinutes: recipe.breakMinutes,
              actualBreakMinutes: 0,
              completedCycles: pomodoros || 1,
              interruptionCount: 0,
              outcome: 'partial',
              debriefNote: 'Imported from the legacy Study Room.',
            },
          });
        }
      }
    });

    await syncLegacyStudyStreak(userId);

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error migrating legacy study data:', error);
    return NextResponse.json({ error: 'Failed to migrate legacy study data' }, { status: 500 });
  }
}
