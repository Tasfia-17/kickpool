import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Generate invite code for a room (REQUIRES AUTH + ROOM ACCESS)
export async function POST(request: Request) {
  try {
    // Security: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const { roomId } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, inviteCode: true, hostId: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Security: Only room host can generate invite codes
    const currentUser = await prisma.user.findUnique({
      where: { username: session.user.name! },
      select: { id: true }
    });

    if (!currentUser || room.hostId !== currentUser.id) {
      logger.warn(`[SECURITY] User ${session.user.name} tried to generate invite for room ${roomId} they don't own`);
      return NextResponse.json({ error: 'Forbidden: Only room host can generate invite codes' }, { status: 403 });
    }

    // If room already has an invite code, return it
    if (room.inviteCode) {
      return NextResponse.json({ inviteCode: room.inviteCode });
    }

    // Generate new invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    await prisma.room.update({
      where: { id: roomId },
      data: { inviteCode }
    });

    return NextResponse.json({ inviteCode });
  } catch (error) {
    logger.error('Error generating invite code:', error);
    return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 });
  }
}

// Get room by invite code
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: { inviteCode: code.toUpperCase() },
      select: { id: true, name: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    logger.error('Error finding room by invite code:', error);
    return NextResponse.json({ error: 'Failed to find room' }, { status: 500 });
  }
}
