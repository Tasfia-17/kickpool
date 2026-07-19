import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateLevel } from '@/lib/xp';

export const dynamic = 'force-dynamic';

// Challenge definitions
const CHALLENGES = [
  {
    id: 'watch_10_horror',
    title: 'Horror Marathon',
    description: 'Watch 10 horror movies this month',
    target: 10,
    type: 'watch_genre',
    genre: 'horror',
    xpReward: 500,
  },
  {
    id: 'join_5_rooms',
    title: 'Social Butterfly',
    description: 'Join 5 different rooms this week',
    target: 5,
    type: 'join_rooms',
    xpReward: 250,
  },
  {
    id: 'watch_with_10_friends',
    title: 'Friend Collector',
    description: 'Watch with 10 different friends',
    target: 10,
    type: 'watch_with_friends',
    xpReward: 750,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's challenge progress
    const progress = await prisma.challengeProgress.findMany({
      where: { userId: session.user.id },
    });

    const challenges = CHALLENGES.map(challenge => {
      const userProgress = progress.find(p => p.challengeId === challenge.id);
      return {
        ...challenge,
        progress: userProgress?.progress || 0,
        completed: userProgress?.completed || false,
        completedAt: userProgress?.completedAt,
      };
    });

    return NextResponse.json({ challenges });
  } catch (error: any) {
    logger.error('Error fetching challenges:', error);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, progress } = await request.json();

    if (!challengeId || progress === undefined) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const challenge = CHALLENGES.find(c => c.id === challengeId);
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const userProgress = await prisma.challengeProgress.upsert({
      where: {
        userId_challengeId: {
          userId: session.user.id,
          challengeId,
        },
      },
      create: {
        userId: session.user.id,
        challengeId,
        progress: Math.min(progress, challenge.target),
        target: challenge.target,
        completed: progress >= challenge.target,
      },
      update: {
        progress: Math.min(progress, challenge.target),
        completed: progress >= challenge.target,
        completedAt: progress >= challenge.target ? new Date() : undefined,
      },
    });

    // Award XP if completed (direct DB update — fetch() with relative URL fails server-side)
    if (userProgress.completed && !userProgress.completedAt) {
      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: session.user.id },
            data: { totalXP: { increment: challenge.xpReward } },
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
        logger.error('Error awarding challenge XP:', e);
      }
    }

    return NextResponse.json({ progress: userProgress });
  } catch (error: any) {
    logger.error('Error updating challenge:', error);
    return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 });
  }
}



