/**
 * GET /api/pools/[poolId] — get pool details with entries
 * PATCH /api/pools/[poolId] — update pool status (host only)
 * DELETE /api/pools/[poolId] — cancel pool (host only, before start)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ poolId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;

  try {
    const pool = await prisma.matchPool.findUnique({
      where: { id: poolId },
      include: {
        creator: { select: { id: true, username: true, image: true } },
        entries: {
          include: {
            user: { select: { id: true, username: true, image: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        commentary: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    return NextResponse.json(pool);
  } catch (err) {
    console.error('[/api/pools/[poolId] GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const pool = await prisma.matchPool.findUnique({ where: { id: poolId } });
    if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    if (pool.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the pool creator can update it' }, { status: 403 });
    }

    const body = await req.json() as { status?: string; name?: string };
    const updated = await prisma.matchPool.update({
      where: { id: poolId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.name   ? { name: body.name }   : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[/api/pools/[poolId] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const pool = await prisma.matchPool.findUnique({ where: { id: poolId } });
    if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    if (pool.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the pool creator can cancel it' }, { status: 403 });
    }
    if (pool.status === 'SETTLED') {
      return NextResponse.json({ error: 'Cannot cancel a settled pool' }, { status: 400 });
    }

    await prisma.matchPool.update({ where: { id: poolId }, data: { status: 'CANCELLED' } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/pools/[poolId] DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
