import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);
    const type = searchParams.get('type'); // Optional filter

    // Get user's friends (both directions)
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId: session.user.id }, { friendId: session.user.id }] },
      select: { userId: true, friendId: true },
    });
    const friendIds = Array.from(new Set(
      friendships.map(f => f.userId === session.user.id ? f.friendId : f.userId)
    ));
    friendIds.push(session.user.id); // Include own activities

    const where: any = {
      userId: { in: friendIds },
    };
    if (type) {
      where.type = type;
    }

    const activities = await (prisma as any).activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    logger.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    if (!type) {
      return NextResponse.json({ error: 'Activity type required' }, { status: 400 });
    }

    const activity = await (prisma as any).activity.create({
      data: {
        userId: session.user.id,
        type,
        data: data ? JSON.stringify(data) : null,
      },
    });

    return NextResponse.json({ activity });
  } catch (error: any) {
    logger.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

