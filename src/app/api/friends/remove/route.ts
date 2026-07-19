import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { invalidateFriendsCacheForBoth } from '@/lib/cache';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// Remove friend
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendId } = await request.json();
    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove friendship (both directions)
    await (prisma as any).friendship.deleteMany({
      where: {
        OR: [
          { userId: user.id, friendId },
          { userId: friendId, friendId: user.id }
        ]
      }
    });
    invalidateFriendsCacheForBoth(user.id, friendId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing friend:', error);
    return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
  }
}
