import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateLevel } from '@/lib/xp';

export const dynamic = 'force-dynamic';

const DAILY_QUESTS = [
  { type: 'join_room', target: 1, xpReward: 50, title: 'Join a Room' },
  { type: 'watch_time', target: 1800, xpReward: 100, title: 'Watch 30 Minutes' }, // 30 min in seconds
  { type: 'send_messages', target: 5, xpReward: 25, title: 'Send 5 Messages' },
  { type: 'create_room', target: 1, xpReward: 75, title: 'Create a Room' },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get start of today in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get end of today in UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Fetch all existing quests for today in one query
    let allQuests = await (prisma as any).dailyQuest.findMany({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
    });

    const existingMap = new Map(allQuests.map((q: any) => [q.questType, q]));
    const missing = DAILY_QUESTS.filter(qd => !existingMap.has(qd.type));

    // Create missing quests in one batch if any
    if (missing.length > 0) {
      await (prisma as any).dailyQuest.createMany({
        data: missing.map(qd => ({
          userId: session.user.id,
          questType: qd.type,
          target: qd.target,
          xpReward: qd.xpReward,
          date: today,
          progress: 0,
          completed: false,
        })),
      });

      // Re-fetch to get populated records (with IDs)
      allQuests = await (prisma as any).dailyQuest.findMany({
        where: {
          userId: session.user.id,
          date: { gte: today, lt: tomorrow },
        },
      });
    }

    const quests = DAILY_QUESTS.map(questDef => {
      const q = allQuests.find((eq: any) => eq.questType === questDef.type);
      return { ...q, title: questDef.title };
    });

    return NextResponse.json({ quests });
  } catch (error: any) {
    logger.error('Error fetching daily quests:', error);
    return NextResponse.json({ error: 'Failed to fetch daily quests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questType, progress } = await request.json();

    if (!questType || progress === undefined) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get start of today in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get end of today in UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const quest = await (prisma as any).dailyQuest.findFirst({
      where: {
        userId: session.user.id,
        questType,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const newProgress = Math.min(quest.progress + progress, quest.target);
    const completed = newProgress >= quest.target && !quest.completed;

    const updatedQuest = await (prisma as any).dailyQuest.update({
      where: { id: quest.id },
      data: {
        progress: newProgress,
        completed,
      },
    });

    // Award XP if completed (direct DB update — fetch() with relative URL fails server-side)
    if (completed && !quest.completed) {
      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: session.user.id },
            data: { totalXP: { increment: quest.xpReward } },
            select: { totalXP: true },
          });
          if (user) {
            await tx.user.update({
              where: { id: session.user.id },
              data: { level: calculateLevel(user.totalXP) } as any,
            });
          }
        });
      } catch (e: any) {
        logger.error('Error awarding quest XP:', e);
      }
    }

    return NextResponse.json({ quest: updatedQuest, xpAwarded: completed && !quest.completed ? quest.xpReward : 0 });
  } catch (error: any) {
    logger.error('Error updating daily quest:', error);
    return NextResponse.json({ error: 'Failed to update daily quest' }, { status: 500 });
  }
}

