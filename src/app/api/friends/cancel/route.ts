import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { invalidateFriendsCacheForBoth } from '@/lib/cache';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Cancel or decline friend request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, username, notificationId } = body;
    
    if (!receiverId && !username) {
      return NextResponse.json({ error: 'Receiver ID or username required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find target user by ID or username
    let targetUserId = receiverId;
    if (!targetUserId && username) {
      const targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetUserId = targetUser.id;
    }

    // Delete request sent BY current user TO target
    await (prisma as any).friendRequest.deleteMany({
      where: {
        senderId: currentUser.id,
        receiverId: targetUserId,
        status: 'PENDING'
      }
    });

    // Also delete request sent BY target TO current user (for decline)
    await (prisma as any).friendRequest.deleteMany({
      where: {
        senderId: targetUserId,
        receiverId: currentUser.id,
        status: 'PENDING'
      }
    });

    // Delete related notification by ID if provided
    if (notificationId) {
      await (prisma as any).notification.delete({
        where: { id: notificationId }
      }).catch(() => {});
    } else {
      await (prisma as any).notification.deleteMany({
        where: {
          userId: currentUser.id,
          type: 'friend_request'
        }
      });
    }

    // Invalidate both users cache for safety
    invalidateFriendsCacheForBoth(currentUser.id, targetUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error canceling friend request:', error);
    return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
  }
}
