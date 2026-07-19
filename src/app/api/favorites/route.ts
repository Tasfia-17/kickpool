import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// GET user's favorite rooms
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    
    // Use include to fetch favorites with room data in a single query
    const favorites = await (prisma as any).favoriteRoom.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            currentVideoTitle: true,
            onlineCount: true,
            maxUsers: true,
          }
        }
      }
    });

    return NextResponse.json(favorites);
  } catch (error) {
    logger.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST - Add a room to favorites
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roomId } = await req.json();
    const userId = (session.user as any).id;

    // Check if already favorited
    const existing = await (prisma as any).favoriteRoom.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 400 });
    }

    const favorite = await (prisma as any).favoriteRoom.create({
      data: { userId, roomId },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    logger.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE - Remove a room from favorites
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roomId } = await req.json();
    const userId = (session.user as any).id;

    await (prisma as any).favoriteRoom.delete({
      where: { userId_roomId: { userId, roomId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
