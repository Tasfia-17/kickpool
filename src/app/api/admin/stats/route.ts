import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.name) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true, isFounder: true }
  });

  // Founder is highest priority, then ADMIN, then PURR_ADMIN
  const adminRoles = ['ADMIN', 'FOUNDER', 'PURR_ADMIN'];
  if (!user || (!adminRoles.includes(user.role?.toUpperCase()) && !user.isFounder)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get today's date for stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [userCount, roomCount, messageCount, bannedCount, vipCount, newUsersToday] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.message.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { isVIP: true } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        createdAt: true,
        role: true,
        isBanned: true,
        isVIP: true,
        isFounder: true,
        totalXP: true,
        level: true
      }
    });

    const activeRooms = await prisma.room.findMany({
      where: { onlineCount: { gt: 0 } },
      select: {
        id: true,
        name: true,
        onlineCount: true,
        currentVideoTitle: true,
        hostId: true,
        createdAt: true
      },
      orderBy: { onlineCount: 'desc' },
      take: 20
    });

    return NextResponse.json({
      stats: {
        users: userCount,
        rooms: roomCount,
        messages: messageCount,
        bannedUsers: bannedCount,
        vipUsers: vipCount,
        newUsersToday: newUsersToday,
      },
      recentUsers,
      activeRooms,
      systemHealth: {
        database: 'healthy',
        socket: 'healthy',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}