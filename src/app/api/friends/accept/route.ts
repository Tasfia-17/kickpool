import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { invalidateFriendsCacheForBoth } from '@/lib/cache';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Accept friend request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Support both senderId and username
    const { senderId, username, notificationId } = body;
    
    if (!senderId && !username) {
      return NextResponse.json({ error: 'Sender ID or username required' }, { status: 400 });
    }

    const receiver = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true, username: true }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find sender by ID or username
    let actualSenderId = senderId;
    if (!actualSenderId && username) {
      const sender = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });
      if (!sender) {
        return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
      }
      actualSenderId = sender.id;
    }

    // Find and update the friend request
    const friendRequest = await (prisma as any).friendRequest.findFirst({
      where: {
        senderId: actualSenderId,
        receiverId: receiver.id,
        status: 'PENDING'
      }
    });

    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Atomically accept request + create bidirectional friendship
    await prisma.$transaction([
      (prisma as any).friendRequest.update({
        where: { id: friendRequest.id },
        data: { status: 'ACCEPTED' }
      }),
      prisma.friendship.create({
        data: { userId: receiver.id, friendId: actualSenderId }
      }),
      prisma.friendship.create({
        data: { userId: actualSenderId, friendId: receiver.id }
      }),
    ]);

    // Invalidate cache for both users
    invalidateFriendsCacheForBoth(receiver.id, actualSenderId);

    // Delete the notification by ID if provided, otherwise by query
    if (notificationId) {
      await (prisma as any).notification.delete({
        where: { id: notificationId }
      }).catch(() => {});
    } else {
      await (prisma as any).notification.deleteMany({
        where: {
          userId: receiver.id,
          type: 'friend_request'
        }
      });
    }

    // Notify the sender
    await (prisma as any).notification.create({
      data: {
        userId: actualSenderId,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${receiver.username} accepted your friend request`,
        data: JSON.stringify({ friendId: receiver.id })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error accepting friend request:', error);
    return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
  }
}
