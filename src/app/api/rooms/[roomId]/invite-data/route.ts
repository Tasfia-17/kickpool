import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        name: true,
        currentVideoTitle: true,
        onlineCount: true,
        maxUsers: true,
        host: {
          select: {
            username: true,
            image: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: room.name,
      currentVideoTitle: room.currentVideoTitle,
      onlineCount: room.onlineCount,
      maxUsers: room.maxUsers,
      host: room.host,
    });
  } catch (error) {
    logger.error('Error fetching room invite data:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}
