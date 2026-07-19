import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// GET user's watch history
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    
    const history = await (prisma as any).watchHistory.findMany({
      where: { userId },
      orderBy: { watchedAt: 'desc' },
      take: 50, // Last 50 entries
    });

    return NextResponse.json(history);
  } catch (error) {
    logger.error('Error fetching watch history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// POST - Add to watch history
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roomId, videoUrl, videoTitle, duration } = await req.json();
    const userId = (session.user as any).id;

    const entry = await (prisma as any).watchHistory.create({
      data: {
        userId,
        roomId,
        videoUrl,
        videoTitle,
        duration: duration || 0,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    logger.error('Error adding to history:', error);
    return NextResponse.json({ error: 'Failed to add to history' }, { status: 500 });
  }
}

// DELETE - Clear watch history
export async function DELETE() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;

    await (prisma as any).watchHistory.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error clearing history:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
