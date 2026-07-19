import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET — list the user's watchlist
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = (session.user as any).id;
    const items = await (prisma as any).watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

// POST — add an item
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tmdbId, tmdbType, title, poster, year } = await req.json();
    if (!tmdbId || !tmdbType || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const item = await (prisma as any).watchlist.upsert({
      where: { userId_tmdbId_tmdbType: { userId, tmdbId: Number(tmdbId), tmdbType } },
      create: { userId, tmdbId: Number(tmdbId), tmdbType, title, poster: poster || null, year: year || null },
      update: {},
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    logger.error('Error adding to watchlist:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

// DELETE — remove an item (pass tmdbId + tmdbType as query params)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get('tmdbId');
    const tmdbType = searchParams.get('tmdbType');

    if (!tmdbId || !tmdbType) {
      return NextResponse.json({ error: 'Missing tmdbId or tmdbType' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await (prisma as any).watchlist.delete({
      where: { userId_tmdbId_tmdbType: { userId, tmdbId: Number(tmdbId), tmdbType } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing from watchlist:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
