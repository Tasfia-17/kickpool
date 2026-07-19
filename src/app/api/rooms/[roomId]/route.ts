import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roomId } = await params;

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user is the host or admin
    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';

    if (room.hostId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Only the host can delete this room' }, { status: 403 });
    }

    // Delete all related records first (some may not have cascade constraints)
    await Promise.all([
      prisma.message.deleteMany({ where: { roomId } }),
      prisma.roomVote.deleteMany({ where: { roomId } }),
      prisma.scheduledRoom.deleteMany({ where: { roomId } }),
      prisma.favoriteRoom.deleteMany({ where: { roomId } }),
      prisma.watchHistory.deleteMany({ where: { roomId } }),
    ]);

    // Delete the room
    await prisma.room.delete({
      where: { id: roomId }
    });

    return NextResponse.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    logger.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        hostId: true,
        isPublic: true,
        maxUsers: true,
        onlineCount: true,
        currentVideoTitle: true,
        currentVideoUrl: true,
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    logger.error('Error fetching room:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roomId } = await params;

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user is the host or admin
    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';

    if (room.hostId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Only the host can update this room' }, { status: 403 });
    }

    const body = await req.json();

    const sanitizeRoomName = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const cleaned = value
        .trim()
        .slice(0, 50)
        .replace(/[<>"&]/g, '');
      return cleaned.length > 0 ? cleaned : null;
    };

    const safeName = body.name === undefined ? room.name : sanitizeRoomName(body.name);
    if (safeName === null) {
      return NextResponse.json({ error: 'Invalid room name' }, { status: 400 });
    }

    // Update room settings
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        name: safeName,
      }
    });

    return NextResponse.json({
      success: true,
      room: updatedRoom
    });
  } catch (error) {
    logger.error('Error updating room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
