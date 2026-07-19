/**
 * POST /api/pools/[poolId]/entries — join a pool
 * GET  /api/pools/[poolId]/entries — list entries
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { demoPoolEscrow, DEMO_MODE } from '@/lib/solana';

interface RouteParams {
  params: Promise<{ poolId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;
  try {
    const entries = await prisma.poolEntry.findMany({
      where: { poolId },
      include: { user: { select: { id: true, username: true, image: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return NextResponse.json(entries);
  } catch (err) {
    console.error('[entries GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { poolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as {
      walletAddress:   string;
      predictedWinner: string;    // 'participant1' | 'participant2' | 'draw'
      predictedScore1: number;
      predictedScore2: number;
    };

    const { walletAddress, predictedWinner, predictedScore1, predictedScore2 } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }
    if (!['participant1', 'participant2', 'draw'].includes(predictedWinner)) {
      return NextResponse.json({ error: 'predictedWinner must be participant1 | participant2 | draw' }, { status: 400 });
    }

    const pool = await prisma.matchPool.findUnique({
      where: { id: poolId },
      include: { _count: { select: { entries: true } } },
    });
    if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    if (pool.status === 'SETTLED' || pool.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Pool is no longer accepting entries' }, { status: 400 });
    }
    if (pool._count.entries >= pool.maxParticipants) {
      return NextResponse.json({ error: 'Pool is full' }, { status: 400 });
    }

    // Check for duplicate entry
    const existing = await prisma.poolEntry.findFirst({
      where: { poolId, userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already joined this pool' }, { status: 409 });
    }

    // Process entry fee (demo or real)
    let txSig = '';
    if (DEMO_MODE || pool.entryFee === 0) {
      const result = demoPoolEscrow({ poolId, userId: session.user.id, entryFee: pool.entryFee });
      txSig = result.txSignature;
    }
    // TODO: In production, verify real on-chain USDC transfer tx sig here

    // Create entry
    const entry = await prisma.poolEntry.create({
      data: {
        poolId,
        userId:          session.user.id,
        walletAddress,
        entryFeePaid:    pool.entryFee,
        predictedWinner,
        predictedScore1: Math.max(0, Math.min(99, predictedScore1)),
        predictedScore2: Math.max(0, Math.min(99, predictedScore2)),
        payoutTxSig:     txSig || null,
      },
    });

    // Update pool prize total
    await prisma.matchPool.update({
      where: { id: poolId },
      data: {
        prizePool: { increment: pool.entryFee },
        status:    'LIVE',
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'You have already joined this pool' }, { status: 409 });
    }
    console.error('[entries POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
