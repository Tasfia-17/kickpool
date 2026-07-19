/**
 * GET /api/pools/[poolId]/commentary — paginated AI commentary history
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ poolId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const take   = Math.min(parseInt(searchParams.get('take') ?? '30'), 100);

  try {
    const commentary = await prisma.aICommentary.findMany({
      where: { poolId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const nextCursor = commentary.length === take ? commentary[commentary.length - 1]?.id : null;

    return NextResponse.json({ commentary, nextCursor });
  } catch (err) {
    console.error('[commentary GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
