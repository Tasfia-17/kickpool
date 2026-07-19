import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getAdminBridgeSecret, getSocketServerAdminUrl } from '@/lib/adminBridge';
import { isSuperAdmin } from '@/lib/security';
import logger from '@/lib/logger';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id: roomId } = await params;
    
    // 1. Delete the room from the database
    // Delete related records first to avoid foreign key constraints
    await prisma.message.deleteMany({ where: { roomId } });
    await prisma.favoriteRoom.deleteMany({ where: { roomId } });
    await prisma.watchHistory.deleteMany({ where: { roomId } });
    
    await prisma.room.delete({
      where: { id: roomId }
    });

    // 2. Notify the custom socket server to force disconnect all clients in the room
    const socketUrl = getSocketServerAdminUrl();
    const secret = getAdminBridgeSecret();

    const res = await fetch(`${socketUrl}/api/admin/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });

    if (!res.ok) {
        console.warn('Socket server responded with an error, room deleted from DB only:', await res.text());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error forcefully deleting room:', error);
    return NextResponse.json({ error: 'Internal server error while deleting room' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id: roomId } = await params;
    const body = await req.json();
    const { name, maxUsers, isPublic } = body;

    // Update DB
    await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined && { name }),
        ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
        ...(isPublic !== undefined && { isPublic }),
      }
    });

    // Notify custom socket server
    const socketUrl = getSocketServerAdminUrl();
    const secret = getAdminBridgeSecret();

    await fetch(`${socketUrl}/api/admin/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, maxUsers: Number(maxUsers) }),
    }).catch(e => console.warn('Failed to notify socket server of room update:', e));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating room:', error);
    return NextResponse.json({ error: 'Internal server error while updating room' }, { status: 500 });
  }
}
