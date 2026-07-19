import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Achievement definitions with server-side checks
// Each returns { unlocked: boolean, progress?: number, max?: number }
const ACHIEVEMENT_CHECKS: Record<
  string,
  (userId: string) => Promise<{ unlocked: boolean; progress?: number; max?: number }>
> = {
  // Room achievements
  'first-room': async (userId) => {
    const count = (await prisma.user.findUnique({ where: { id: userId }, select: { roomsCreated: true } }))?.roomsCreated ?? 0;
    return { unlocked: count >= 1, progress: Math.min(count, 1), max: 1 };
  },
  'room-master': async (userId) => {
    const count = (await prisma.user.findUnique({ where: { id: userId }, select: { roomsCreated: true } }))?.roomsCreated ?? 0;
    return { unlocked: count >= 10, progress: Math.min(count, 10), max: 10 };
  },
  'party-host': async (userId) => {
    const result = await prisma.room.aggregate({ where: { hostId: userId }, _max: { onlineCount: true } });
    const best = result._max.onlineCount ?? 0;
    return { unlocked: best >= 5, progress: Math.min(best, 5), max: 5 };
  },

  // Social achievements
  // Count only userId to avoid double-counting bidirectional friendships
  'first-friend': async (userId) => {
    const count = await prisma.friendship.count({ where: { userId } });
    return { unlocked: count >= 1, progress: Math.min(count, 1), max: 1 };
  },
  'social-butterfly': async (userId) => {
    const count = await prisma.friendship.count({ where: { userId } });
    return { unlocked: count >= 10, progress: Math.min(count, 10), max: 10 };
  },
  'popular': async (userId) => {
    const count = await prisma.friendship.count({ where: { userId } });
    return { unlocked: count >= 50, progress: Math.min(count, 50), max: 50 };
  },

  // Chat achievements
  'first-message': async (userId) => {
    const count = (await prisma.user.findUnique({ where: { id: userId }, select: { messagesSent: true } }))?.messagesSent ?? 0;
    return { unlocked: count >= 1, progress: Math.min(count, 1), max: 1 };
  },
  'chatterbox': async (userId) => {
    const count = (await prisma.user.findUnique({ where: { id: userId }, select: { messagesSent: true } }))?.messagesSent ?? 0;
    return { unlocked: count >= 100, progress: Math.min(count, 100), max: 100 };
  },
  'storyteller': async (userId) => {
    const count = (await prisma.user.findUnique({ where: { id: userId }, select: { messagesSent: true } }))?.messagesSent ?? 0;
    return { unlocked: count >= 1000, progress: Math.min(count, 1000), max: 1000 };
  },

  // Watch time achievements (watchTime stored in seconds)
  'first-watch': async (userId) => {
    const wt = (await prisma.user.findUnique({ where: { id: userId }, select: { watchTime: true } }))?.watchTime ?? 0;
    return { unlocked: wt >= 60, progress: Math.min(wt, 60), max: 60 };
  },
  'binge-watcher': async (userId) => {
    const wt = (await prisma.user.findUnique({ where: { id: userId }, select: { watchTime: true } }))?.watchTime ?? 0;
    const target = 36000; // 10 hours
    return { unlocked: wt >= target, progress: Math.min(wt, target), max: target };
  },
  'movie-marathon': async (userId) => {
    const wt = (await prisma.user.findUnique({ where: { id: userId }, select: { watchTime: true } }))?.watchTime ?? 0;
    const target = 360000; // 100 hours
    return { unlocked: wt >= target, progress: Math.min(wt, target), max: target };
  },

  // Study achievements (studyStreak in hours)
  'first-study': async (userId) => {
    const ss = (await prisma.user.findUnique({ where: { id: userId }, select: { studyStreak: true } }))?.studyStreak ?? 0;
    return { unlocked: ss >= 1, progress: Math.min(ss, 1), max: 1 };
  },
  'study-streak-7': async (userId) => {
    const ss = (await prisma.user.findUnique({ where: { id: userId }, select: { studyStreak: true } }))?.studyStreak ?? 0;
    const target = 168; // 7 days × 24 h
    return { unlocked: ss >= target, progress: Math.min(ss, target), max: target };
  },
  'focused-scholar': async (userId) => {
    const ss = (await prisma.user.findUnique({ where: { id: userId }, select: { studyStreak: true } }))?.studyStreak ?? 0;
    return { unlocked: ss >= 100, progress: Math.min(ss, 100), max: 100 };
  },

  // Loyalty achievements
  'veteran': async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) return { unlocked: false, progress: 0, max: 30 };
    const days = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000);
    return { unlocked: days >= 30, progress: Math.min(days, 30), max: 30 };
  },
  'dedicated': async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) return { unlocked: false, progress: 0, max: 100 };
    const days = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000);
    return { unlocked: days >= 100, progress: Math.min(days, 100), max: 100 };
  },
  'og-member': async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) return { unlocked: false };
    return { unlocked: user.createdAt < new Date('2026-01-01') };
  },

  // XP milestone achievements
  'xp-1000': async (userId) => {
    const xp = (await prisma.user.findUnique({ where: { id: userId }, select: { totalXP: true } }))?.totalXP ?? 0;
    return { unlocked: xp >= 1000, progress: Math.min(xp, 1000), max: 1000 };
  },
  'xp-10000': async (userId) => {
    const xp = (await prisma.user.findUnique({ where: { id: userId }, select: { totalXP: true } }))?.totalXP ?? 0;
    return { unlocked: xp >= 10000, progress: Math.min(xp, 10000), max: 10000 };
  },
};

// Client-side only achievements (awarded from client, only persisted via POST)
const CLIENT_ONLY_ACHIEVEMENTS = new Set(['night-owl', 'early-bird', 'konami', 'theme-explorer']);

// GET — check all achievements, persist newly unlocked to DB, return full state
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // Load current state from DB in one shot
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        unlockedBadges: true,
        watchTime: true,
        roomsJoined: true,
        roomsCreated: true,
        messagesSent: true,
        createdAt: true,
        totalXP: true,
        studyStreak: true,
      } as Record<string, boolean>,
    }) as {
      unlockedBadges: string[];
      watchTime: number;
      roomsJoined: number;
      roomsCreated: number;
      messagesSent: number;
      createdAt: Date;
      totalXP: number;
      studyStreak: number;
    } | null;

    const alreadyUnlocked = new Set<string>(user?.unlockedBadges ?? []);
    const progressMap: Record<string, { progress: number; max: number }> = {};
    const newlyUnlocked: string[] = [];

    // Run all server-side checks
    for (const [achievementId, checkFn] of Object.entries(ACHIEVEMENT_CHECKS)) {
      try {
        const result = await checkFn(userId);

        if (result.progress !== undefined && result.max !== undefined) {
          progressMap[achievementId] = { progress: result.progress, max: result.max };
        }

        // Only add to newly unlocked if not already stored in DB
        if (result.unlocked && !alreadyUnlocked.has(achievementId)) {
          newlyUnlocked.push(achievementId);
          alreadyUnlocked.add(achievementId);
        }
      } catch (e) {
        logger.error(`Error checking achievement ${achievementId}:`, e);
      }
    }

    // Persist newly unlocked to DB (idempotent — always a set, never duplicates)
    if (newlyUnlocked.length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { unlockedBadges: Array.from(alreadyUnlocked) } as Record<string, unknown>,
      });
    }

    // Additional stats for progress bars
    // Count friendships where userId is the current user (not friendId) to avoid double-counting
    // since friendships are stored bidirectionally
    const friendCount = await prisma.friendship.count({ where: { userId } });

    return NextResponse.json({
      achievements: Array.from(alreadyUnlocked), // all unlocked IDs
      newlyUnlocked,
      progress: progressMap,
      stats: {
        watchTime: user?.watchTime ?? 0,
        roomsJoined: user?.roomsJoined ?? 0,
        roomsCreated: user?.roomsCreated ?? 0,
        messagesSent: user?.messagesSent ?? 0,
        friends: friendCount,
        totalXP: user?.totalXP ?? 0,
        studyStreak: user?.studyStreak ?? 0,
        memberSince: user?.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — award a client-side achievement (night-owl, early-bird, konami, theme-explorer)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json().catch(() => ({}));
    const { achievementId } = body as { achievementId?: string };

    if (!achievementId || typeof achievementId !== 'string') {
      return NextResponse.json({ error: 'Invalid achievementId' }, { status: 400 });
    }

    // Only allow whitelisted client-side achievements
    if (!CLIENT_ONLY_ACHIEVEMENTS.has(achievementId)) {
      return NextResponse.json({ error: 'Achievement cannot be awarded client-side' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { unlockedBadges: true } });
    const current = user?.unlockedBadges ?? [];

    if (current.includes(achievementId)) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { unlockedBadges: [...current, achievementId] },
    });

    return NextResponse.json({ success: true, alreadyUnlocked: false });
  } catch (error) {
    logger.error('Error awarding client achievement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
