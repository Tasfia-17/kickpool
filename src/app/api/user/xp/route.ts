import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateLevel, getXPForNextLevel, getXPProgress, getXPNeededForNextLevel, getProgressPercent } from '@/lib/xp';
import { checkRateLimit } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalXP: true,
        level: true,
      } as any,
    }) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentLevel = calculateLevel(user.totalXP);
    const xpForNextLevel = getXPForNextLevel(currentLevel);
    const xpProgress = getXPProgress(user.totalXP, currentLevel);
    const xpNeeded = getXPNeededForNextLevel(user.totalXP, currentLevel);

    return NextResponse.json({
      totalXP: user.totalXP,
      level: currentLevel,
      xpProgress,
      xpForNextLevel,
      xpNeeded,
      progressPercent: getProgressPercent(user.totalXP, currentLevel),
    });
  } catch (error: any) {
    logger.error('Error fetching XP:', error);
    return NextResponse.json({ error: 'Failed to fetch XP' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason } = await request.json();

    if (!amount || amount <= 0 || amount > 1000) {
      return NextResponse.json({ error: 'Invalid XP amount (must be 1-1000)' }, { status: 400 });
    }

    // Rate limit: max 10 XP grants per minute per user
    const rateLimit = checkRateLimit(`xp:${session.user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many XP requests. Please wait.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalXP: true,
        level: true,
      } as any,
    }) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          totalXP: { increment: amount },
        },
        select: { totalXP: true },
      });

      const newLevel = calculateLevel(updatedUser.totalXP);
      const oldLevel = calculateLevel(updatedUser.totalXP - amount);

      if (updatedUser.totalXP >= 0) {
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            level: newLevel,
          } as any,
        });
      }

      return {
        totalXP: updatedUser.totalXP,
        level: newLevel,
        oldLevel,
      };
    });

    const leveledUp = result.level > result.oldLevel;
    const xpForNextLevel = getXPForNextLevel(result.level);
    const xpNeeded = getXPNeededForNextLevel(result.totalXP, result.level);

    return NextResponse.json({
      totalXP: result.totalXP,
      level: result.level,
      leveledUp,
      xpNeeded,
      progressPercent: getProgressPercent(result.totalXP, result.level),
    });
  } catch (error: any) {
    logger.error('Error updating XP:', error);
    return NextResponse.json({ error: 'Failed to update XP' }, { status: 500 });
  }
}

