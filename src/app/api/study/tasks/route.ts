import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStudyDashboard } from '@/lib/studyData';
import {
  getStudySessionUserId,
  sanitizeStudyMultiline,
  sanitizeStudyText,
  toOptionalInt,
  unauthorizedStudyResponse,
} from '@/lib/studyRouteUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json({
      tasks: dashboard.tasks,
      activeTask: dashboard.activeTask,
    });
  } catch (error) {
    logger.error('Error fetching study tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch study tasks' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const body = await request.json();
    const action = sanitizeStudyText(body?.action, 32);

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'create') {
      const title = sanitizeStudyText(body?.title, 140);
      if (!title) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
      }

      const details = sanitizeStudyMultiline(body?.details, 800) || null;
      const etaMinutes = toOptionalInt(body?.etaMinutes);
      const priority = sanitizeStudyText(body?.priority, 16).toUpperCase() || 'MEDIUM';
      const energy = sanitizeStudyText(body?.energy, 16).toUpperCase() || 'STEADY';
      const taskType = sanitizeStudyText(body?.taskType, 24) || 'general';
      const activate = Boolean(body?.activate);
      const currentMax = await prisma.studyTask.aggregate({
        where: { userId },
        _max: { position: true },
      });

      await prisma.$transaction(async (tx) => {
        if (activate) {
          await tx.studyTask.updateMany({
            where: { userId, status: 'ACTIVE' },
            data: { status: 'BACKLOG' },
          });
        }

        await tx.studyTask.create({
          data: {
            userId,
            title,
            details,
            etaMinutes,
            priority,
            energy,
            taskType,
            status: activate ? 'ACTIVE' : 'BACKLOG',
            position: (currentMax._max.position ?? 0) + 1,
          },
        });
      });
    }

    if (action === 'activate') {
      const taskId = sanitizeStudyText(body?.taskId, 64);
      if (!taskId) {
        return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
      }

      const ownedTask = await prisma.studyTask.findFirst({
        where: { id: taskId, userId },
        select: { id: true },
      });

      if (!ownedTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.studyTask.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'BACKLOG' },
        });

        await tx.studyTask.update({
          where: { id: ownedTask.id },
          data: { status: 'ACTIVE' },
        });
      });
    }

    if (action === 'update') {
      const taskId = sanitizeStudyText(body?.taskId, 64);
      if (!taskId) {
        return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
      }

      const title = sanitizeStudyText(body?.title, 140);
      const details = sanitizeStudyMultiline(body?.details, 800) || null;
      const etaMinutes = toOptionalInt(body?.etaMinutes);
      const priority = sanitizeStudyText(body?.priority, 16).toUpperCase() || undefined;
      const energy = sanitizeStudyText(body?.energy, 16).toUpperCase() || undefined;
      const taskType = sanitizeStudyText(body?.taskType, 24) || undefined;
      const status = sanitizeStudyText(body?.status, 24).toUpperCase() || undefined;
      const isPinned = typeof body?.isPinned === 'boolean' ? body.isPinned : undefined;

      await prisma.studyTask.updateMany({
        where: { id: taskId, userId },
        data: {
          ...(title ? { title } : {}),
          details,
          ...(etaMinutes !== null ? { etaMinutes } : {}),
          ...(priority ? { priority } : {}),
          ...(energy ? { energy } : {}),
          ...(taskType ? { taskType } : {}),
          ...(status ? { status } : {}),
          ...(typeof isPinned === 'boolean' ? { isPinned } : {}),
        },
      });
    }

    if (action === 'complete') {
      const taskId = sanitizeStudyText(body?.taskId, 64);
      if (!taskId) {
        return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
      }

      await prisma.studyTask.updateMany({
        where: { id: taskId, userId },
        data: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });
    }

    if (action === 'reorder') {
      const orderedIds = Array.isArray(body?.orderedIds)
        ? body.orderedIds.map((value: unknown) => sanitizeStudyText(value, 64)).filter(Boolean)
        : [];

      if (!orderedIds.length) {
        return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
      }

      await prisma.$transaction(
        orderedIds.map((taskId: string, index: number) =>
          prisma.studyTask.updateMany({
            where: { id: taskId, userId },
            data: { position: index },
          }),
        ),
      );
    }

    if (action === 'delete') {
      const taskId = sanitizeStudyText(body?.taskId, 64);
      if (!taskId) {
        return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
      }

      await prisma.studyTask.deleteMany({ where: { id: taskId, userId } });
    }

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error mutating study tasks:', error);
    return NextResponse.json({ error: 'Failed to update study tasks' }, { status: 500 });
  }
}
