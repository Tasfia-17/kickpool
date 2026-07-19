import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { isValidId } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const start = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const friendId = url.searchParams.get('friendId');
    if (!friendId) return NextResponse.json({ error: 'friendId required' }, { status: 400 });
    if (!isValidId(friendId)) return NextResponse.json({ error: 'Invalid friendId format' }, { status: 400 });

    const userId = session.user.id;

    // Verify friendship exists before allowing DM access (prevent IDOR)
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: 'You can only view messages with friends' }, { status: 403 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' }
    });

    logger.debug(`[DM] Fetched ${messages.length} messages between ${userId} and ${friendId} in ${Date.now() - start}ms`);

    return NextResponse.json(messages);
  } catch (err) {
    logger.error('DM GET error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { friendId, text } = body;
    if (!friendId || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'friendId and text required' }, { status: 400 });
    }

    const senderId = session.user.id;

    // Check that the users are friends before allowing DM
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: friendId },
          { userId: friendId, friendId: senderId }
        ]
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: 'You can only message friends' }, { status: 403 });
    }

    // Sanitize text to prevent XSS (keep apostrophes readable - they're safe in text content)
    const sanitizeText = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const sanitizedText = sanitizeText(text.trim());

    const dm = await prisma.directMessage.create({
      data: {
        text: sanitizedText,
        senderId,
        receiverId: friendId,
      }
    });

    // Optionally add a Notification
    try {
      await prisma.notification.create({
        data: {
          userId: friendId,
          type: 'message',
          title: 'New message',
          message: `${session.user.username} sent you a message`,
          data: JSON.stringify({ directMessageId: dm.id })
        }
      });
    } catch (e) {
      // ignore but log
      logger.error('Failed to create DM notification', e);
    }
    logger.debug(`[DM] Created DM ${dm.id} from ${senderId} to ${friendId} in ${Date.now() - start}ms`);

    return NextResponse.json(dm, { status: 201 });
  } catch (err) {
    logger.error('DM POST error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
