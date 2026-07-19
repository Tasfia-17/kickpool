import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'watchTime';
    const period = searchParams.get('period') || 'all'; // 'daily', 'weekly', 'monthly', 'all'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100);

    // Build date filter based on period
    let dateFilter: any = {};
    const now = new Date();
    if (period === 'daily') {
      dateFilter = { updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
    }

    let leaderboard: any[] = [];

    switch (type) {
      case 'watchTime':
        leaderboard = await prisma.user.findMany({
          where: { watchTime: { gt: 0 }, ...dateFilter } as any,
          select: {
            id: true,
            username: true,
            image: true,
            watchTime: true,
            level: true,
            currentStreak: true,
          } as any,
          orderBy: { watchTime: 'desc' } as any,
          take: limit,
        }) as any;
        break;

      case 'roomsCreated':
        leaderboard = await prisma.user.findMany({
          where: {
            roomsCreated: { gt: 0 },
            ...dateFilter,
          } as any,
          select: {
            id: true,
            username: true,
            image: true,
            roomsCreated: true,
            level: true,
            currentStreak: true,
          } as any,
          orderBy: { roomsCreated: 'desc' } as any,
          take: limit,
        }) as any;
        break;

      case 'messagesSent':
        leaderboard = await prisma.user.findMany({
          where: { messagesSent: { gt: 0 }, ...dateFilter } as any,
          select: {
            id: true,
            username: true,
            image: true,
            messagesSent: true,
            level: true,
            currentStreak: true,
          } as any,
          orderBy: { messagesSent: 'desc' } as any,
          take: limit,
        }) as any;
        break;

      case 'streak':
        leaderboard = await prisma.user.findMany({
          where: { currentStreak: { gt: 0 }, ...dateFilter } as any,
          select: {
            id: true,
            username: true,
            image: true,
            currentStreak: true,
            longestStreak: true,
            level: true,
          } as any,
          orderBy: { currentStreak: 'desc' } as any,
          take: limit,
        }) as any;
        break;

      case 'level':
        leaderboard = await prisma.user.findMany({
          where: { level: { gt: 1 }, ...dateFilter } as any,
          select: {
            id: true,
            username: true,
            image: true,
            level: true,
            totalXP: true,
            currentStreak: true,
          } as any,
          orderBy: { level: 'desc' } as any,
          take: limit,
        }) as any;
        break;

      default:
        return NextResponse.json({ error: 'Invalid leaderboard type' }, { status: 400 });
    }

    return NextResponse.json({
      type,
      period,
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        ...user,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

