import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
// Removed uuid import - not needed

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: any = {
      scheduledAt: upcoming ? { gte: new Date() } : undefined,
    };

    const scheduledRooms = await (prisma as any).scheduledRoom.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            currentVideoTitle: true,
            onlineCount: true,
            maxUsers: true,
          },
        },
        host: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });

    return NextResponse.json({ scheduledRooms });
  } catch (error: any) {
    logger.error('Error fetching scheduled rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled rooms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, scheduledAt, title, description } = await request.json();

    if (!roomId || !scheduledAt) {
      return NextResponse.json({ error: 'Room ID and scheduled time required' }, { status: 400 });
    }

    // Verify user owns the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true },
    });

    if (!room || room.hostId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create or update scheduled room
    const scheduledRoom = await (prisma as any).scheduledRoom.upsert({
      where: { roomId },
      create: {
        roomId,
        hostId: session.user.id,
        scheduledAt: new Date(scheduledAt),
        title,
        description,
      },
      update: {
        scheduledAt: new Date(scheduledAt),
        title,
        description,
      },
    });

    // Update room
    await prisma.room.update({
      where: { id: roomId },
      data: {
        isScheduled: true as any,
        scheduledStart: new Date(scheduledAt) as any,
      } as any,
    });

    return NextResponse.json({ scheduledRoom });
  } catch (error: any) {
    logger.error('Error creating scheduled room:', error);
    return NextResponse.json({ error: 'Failed to create scheduled room' }, { status: 500 });
  }
}

