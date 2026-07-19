import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 50);

    // Get user's watch history for recommendations
    let userPreferences: string[] = [];
    if (session?.user) {
      const history = await prisma.watchHistory.findMany({
        where: { userId: session.user.id },
        take: 50,
        orderBy: { watchedAt: 'desc' },
      });
      // Extract categories/tags from history (simplified - would need room data)
      userPreferences = ['general']; // Placeholder
    }

    // Get rooms where friends are active
    let friendsRooms: any[] = [];
    if (session?.user) {
      const friendships = await prisma.friendship.findMany({
        where: { OR: [{ userId: session.user.id }, { friendId: session.user.id }] },
        select: { userId: true, friendId: true },
      });
      const friendIds = Array.from(new Set(
        friendships.map(f => f.userId === session.user.id ? f.friendId : f.userId)
      ));

      if (friendIds.length > 0) {
        // This would need to check active rooms - simplified for now
        friendsRooms = [];
      }
    }

    // Get trending rooms and recently active rooms in parallel
    const [trendingRooms, recentRooms] = await Promise.all([
      // Get trending rooms (most active)
      prisma.room.findMany({
        where: {
          isPublic: true,
          onlineCount: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          currentVideoTitle: true,
          onlineCount: true,
          maxUsers: true,
          updatedAt: true,
        },
        orderBy: [
          { onlineCount: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: limit,
      }),
      // Get recently active rooms
      prisma.room.findMany({
        where: {
          isPublic: true,
          updatedAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
          },
        },
        select: {
          id: true,
          name: true,
          currentVideoTitle: true,
          onlineCount: true,
          maxUsers: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })
    ]);

    return NextResponse.json({
      trending: trendingRooms,
      recent: recentRooms,
      friendsWatching: friendsRooms,
    });
  } catch (error: any) {
    logger.error('Error fetching recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}



