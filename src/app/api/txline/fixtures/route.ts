/**
 * GET /api/txline/fixtures — World Cup fixtures from TxLINE
 *
 * Cached server-side for 5 minutes to avoid hammering TxLINE.
 */
import { NextResponse } from 'next/server';
import { getFixturesSnapshot, WORLD_CUP_COMPETITION_ID } from '@/lib/txline';

let _cache: { data: unknown; expiry: number } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (_cache && now < _cache.expiry) {
      return NextResponse.json(_cache.data);
    }

    const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);

    // Sort by start time ascending
    const sorted = [...fixtures].sort((a, b) => a.StartTime - b.StartTime);

    _cache = { data: sorted, expiry: now + 5 * 60 * 1000 };
    return NextResponse.json(sorted);
  } catch (err) {
    console.error('[/api/txline/fixtures]', err);
    return NextResponse.json({ error: 'Failed to load fixtures from TxLINE' }, { status: 502 });
  }
}
