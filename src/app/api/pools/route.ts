/**
 * GET /api/pools — list public pools or search by invite code
 * POST /api/pools — create a new pool (requires auth)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFixtureById, WORLD_CUP_COMPETITION_ID, getFixturesSnapshot } from '@/lib/txline';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inviteCode = searchParams.get('invite');
  const fixtureId  = searchParams.get('fixtureId');
  const status     = searchParams.get('status') ?? 'PENDING,LIVE';

  try {
    if (inviteCode) {
      const pool = await prisma.matchPool.findUnique({
        where: { inviteCode },
        include: { entries: { include: { user: { select: { id: true, username: true, image: true } } } } },
      });
      if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      return NextResponse.json(pool);
    }

    const statusArr = status.split(',');
    const pools = await prisma.matchPool.findMany({
      where: {
        status: { in: statusArr },
        ...(fixtureId ? { fixtureId: parseInt(fixtureId) } : {}),
      },
      include: {
        creator:  { select: { id: true, username: true, image: true } },
        _count:   { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(pools);
  } catch (err) {
    console.error('[/api/pools GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      fixtureId: number;
      entryFee:  number;
      maxParticipants: number;
    };

    const { fixtureId, entryFee, maxParticipants } = body;

    if (!fixtureId || typeof fixtureId !== 'number') {
      return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 });
    }
    if (entryFee < 0 || entryFee > 100) {
      return NextResponse.json({ error: 'Entry fee must be 0–100 USDC' }, { status: 400 });
    }
    if (maxParticipants < 2 || maxParticipants > 50) {
      return NextResponse.json({ error: 'maxParticipants must be 2–50' }, { status: 400 });
    }

    // Fetch fixture details from TxLINE
    const fixture = await getFixtureById(fixtureId).catch(() => null);

    if (!fixture) {
      // Attempt to load all World Cup fixtures
      const allFixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID).catch(() => []);
      const found = allFixtures.find(f => f.FixtureId === fixtureId);
      if (!found) return NextResponse.json({ error: 'Fixture not found in TxLINE' }, { status: 404 });
    }

    const fix = fixture ?? { Participant1: 'Team A', Participant2: 'Team B', StartTime: Date.now() / 1000 };

    const pool = await prisma.matchPool.create({
      data: {
        fixtureId,
        name:            `${fix.Participant1} vs ${fix.Participant2}`,
        participant1:    fix.Participant1,
        participant2:    fix.Participant2,
        startTime:       new Date(fix.StartTime * 1000),
        entryFee,
        maxParticipants,
        inviteCode:      nanoid(10),
        creatorId:       session.user.id,
        status:          'PENDING',
      },
    });

    return NextResponse.json(pool, { status: 201 });
  } catch (err) {
    console.error('[/api/pools POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
