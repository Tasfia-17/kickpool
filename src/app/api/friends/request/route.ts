import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { invalidateFriendsCacheFor } from '@/lib/cache';
import { isValidId, checkRateLimit } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Send friend request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, username } = body;
    
    if (!receiverId && !username) {
      return NextResponse.json({ error: 'Receiver ID or username required' }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true, username: true }
    });

    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find receiver by ID or username
    let actualReceiverId = receiverId;
    if (!actualReceiverId && username) {
      const receiver = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });
      if (!receiver) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      actualReceiverId = receiver.id;
    }

    // Can't send request to yourself
    if (actualReceiverId === sender.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 });
    }

    // Check if they're already friends
    const existingFriendship = await (prisma as any).friendship.findFirst({
      where: {
        OR: [
          { userId: sender.id, friendId: actualReceiverId },
          { userId: actualReceiverId, friendId: sender.id }
        ]
      }
    });

    if (existingFriendship) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 });
    }

    // Check for existing request
    const existingRequest = await (prisma as any).friendRequest.findFirst({
      where: {
        OR: [
          { senderId: sender.id, receiverId: actualReceiverId, status: 'PENDING' },
          { senderId: actualReceiverId, receiverId: sender.id, status: 'PENDING' }
        ]
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Request already exists' }, { status: 400 });
    }

    // Create friend request
    const friendRequest = await (prisma as any).friendRequest.create({
      data: {
        senderId: sender.id,
        receiverId: actualReceiverId
      }
    });

    // Create notification for receiver
    await (prisma as any).notification.create({
      data: {
        userId: actualReceiverId,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${sender.username} sent you a friend request`,
        data: JSON.stringify({ 
          requestId: friendRequest.id, 
          fromUserId: sender.id,
          fromUsername: sender.username 
        })
      }
    });

    // Invalidate receiver's friends cache (not strictly necessary, but safe)
    invalidateFriendsCacheFor(actualReceiverId);
    return NextResponse.json({ success: true, requestId: friendRequest.id });
  } catch (error: any) {
    logger.error('Error sending friend request:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'You have already sent a request or are already friends.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}

// Get pending friend requests
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requests = await (prisma as any).friendRequest.findMany({
      where: {
        receiverId: user.id,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(requests);
  } catch (error) {
    logger.error('Error fetching friend requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}
