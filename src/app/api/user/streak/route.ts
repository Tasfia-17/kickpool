import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastLoginDate: true,
      } as any,
    }) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastLoginDate: user.lastLoginDate,
    });
  } catch (error: any) {
    logger.error('Error fetching streak:', error);
    return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastLoginDate: true,
      } as any,
    }) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let newStreak = user.currentStreak;
    let newLongestStreak = user.longestStreak;

    if (user.lastLoginDate) {
      const lastLogin = new Date(user.lastLoginDate);
      const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const daysDiff = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already logged in today, no change
        return NextResponse.json({
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          updated: false,
        });
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = user.currentStreak + 1;
        if (newStreak > user.longestStreak) {
          newLongestStreak = newStreak;
        }
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    } else {
      // First login, start streak
      newStreak = 1;
      if (newStreak > user.longestStreak) {
        newLongestStreak = newStreak;
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastLoginDate: now,
      } as any,
    });

    // Award daily crate if this is a new day login
    // Use same date comparison logic as /api/crates/daily to prevent duplicates
    // Using UTC to avoid timezone issues
    if (newStreak > 0) {
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      
      const existingCrate = await (prisma as any).crate.findFirst({
        where: {
          userId: session.user.id,
          crateType: 'daily',
          createdAt: {
            gte: todayUTC,
          },
        },
      });

      if (!existingCrate) {
        await (prisma as any).crate.create({
          data: {
            userId: session.user.id,
            crateType: 'daily',
          },
        });
      }
    }

    // Award badge for streak milestones
    const badgesToAward: { id: string; title: string; icon: string }[] = [];
    if (newStreak === 7) {
      badgesToAward.push({ id: 'streak-7', title: 'Week Warrior', icon: '🔥' });
    } else if (newStreak === 30) {
      badgesToAward.push({ id: 'streak-30', title: 'Monthly Master', icon: '⭐' });
    } else if (newStreak === 100) {
      badgesToAward.push({ id: 'streak-100', title: 'Century Streak', icon: '💯' });
    }

    return NextResponse.json({
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      updated: true,
      badgesToAward,
    });
  } catch (error: any) {
    logger.error('Error updating streak:', error);
    return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 });
  }
}

