/**
 * POST /api/txline/replay
 * Triggers a match replay via the socket server admin bridge.
 * Uses TxLINE historical endpoint to re-stream a finished match.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { poolId, fixtureId, speedMultiplier = 30 } = await req.json() as {
      poolId: string;
      fixtureId: number;
      speedMultiplier?: number;
    };

    if (!poolId || !fixtureId) {
      return NextResponse.json({ error: 'poolId and fixtureId required' }, { status: 400 });
    }

    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
    const adminSecret     = process.env.NEXTAUTH_SECRET ?? '';

    const res = await fetch(`${socketServerUrl}/api/admin/replay`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ secret: adminSecret, poolId, fixtureId, speedMultiplier }),
    });

    if (!res.ok) {
      const body = await res.json() as { error?: string };
      return NextResponse.json({ error: body.error ?? 'Replay trigger failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: `Replay started at ${speedMultiplier}x` });
  } catch (err) {
    console.error('[/api/txline/replay]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
