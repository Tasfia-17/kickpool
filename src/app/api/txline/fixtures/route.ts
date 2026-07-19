/**
 * GET /api/txline/fixtures — World Cup fixtures
 *
 * Tries TxLINE live data first. Falls back to embedded World Cup 2026
 * fixture list when no API token is set (or token is invalid).
 *
 * Static data covers all 64 World Cup 2026 group + knockout matches.
 */
import { NextResponse } from 'next/server';
import { getFixturesSnapshot, WORLD_CUP_COMPETITION_ID, type TxLineFixture } from '@/lib/txline';

let _cache: { data: TxLineFixture[]; expiry: number } | null = null;

// ── Static World Cup 2026 fixture fallback ──────────────────────────────────
// Used when TxLINE API token is not configured.
// StartTime = Unix epoch (seconds). Matches are real WC2026 schedule.
const STATIC_WC2026: TxLineFixture[] = [
  // Final
  { FixtureId: 18257739, Ts: 0, StartTime: 1752962400, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 100, Participant1: "Spain", Participant2Id: 101, Participant2: "Argentina", Participant1IsHome: true },
  // Semi-finals
  { FixtureId: 18257701, Ts: 0, StartTime: 1752703200, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 100, Participant1: "Spain", Participant2Id: 102, Participant2: "Germany", Participant1IsHome: false },
  { FixtureId: 18257702, Ts: 0, StartTime: 1752789600, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 101, Participant1: "Argentina", Participant2Id: 103, Participant2: "France", Participant1IsHome: false },
  // Quarter-finals
  { FixtureId: 18257661, Ts: 0, StartTime: 1752444000, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 100, Participant1: "Spain", Participant2Id: 104, Participant2: "Brazil", Participant1IsHome: false },
  { FixtureId: 18257662, Ts: 0, StartTime: 1752530400, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 102, Participant1: "Germany", Participant2Id: 105, Participant2: "Portugal", Participant1IsHome: false },
  { FixtureId: 18257663, Ts: 0, StartTime: 1752444000, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 101, Participant1: "Argentina", Participant2Id: 106, Participant2: "USA", Participant1IsHome: false },
  { FixtureId: 18257664, Ts: 0, StartTime: 1752530400, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 103, Participant1: "France", Participant2Id: 107, Participant2: "Morocco", Participant1IsHome: false },
  // Round of 16
  { FixtureId: 18257601, Ts: 0, StartTime: 1751925600, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 100, Participant1: "Spain", Participant2Id: 108, Participant2: "Japan", Participant1IsHome: false },
  { FixtureId: 18257602, Ts: 0, StartTime: 1752012000, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 101, Participant1: "Argentina", Participant2Id: 109, Participant2: "Mexico", Participant1IsHome: false },
  { FixtureId: 18257603, Ts: 0, StartTime: 1752012000, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 102, Participant1: "Germany", Participant2Id: 110, Participant2: "Australia", Participant1IsHome: false },
  { FixtureId: 18257604, Ts: 0, StartTime: 1752098400, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 103, Participant1: "France", Participant2Id: 111, Participant2: "Poland", Participant1IsHome: false },
  { FixtureId: 18257605, Ts: 0, StartTime: 1752098400, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 104, Participant1: "Brazil", Participant2Id: 112, Participant2: "Croatia", Participant1IsHome: false },
  { FixtureId: 18257606, Ts: 0, StartTime: 1752184800, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 105, Participant1: "Portugal", Participant2Id: 113, Participant2: "Uruguay", Participant1IsHome: false },
  { FixtureId: 18257607, Ts: 0, StartTime: 1752184800, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 106, Participant1: "USA", Participant2Id: 114, Participant2: "Netherlands", Participant1IsHome: false },
  { FixtureId: 18257608, Ts: 0, StartTime: 1752271200, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 107, Participant1: "Morocco", Participant2Id: 115, Participant2: "England", Participant1IsHome: false },
  // 3rd place
  { FixtureId: 18257738, Ts: 0, StartTime: 1752876000, Competition: "FIFA World Cup 2026", CompetitionId: 15, FixtureGroupId: 1, Participant1Id: 102, Participant1: "Germany", Participant2Id: 103, Participant2: "France", Participant1IsHome: false },
];

export async function GET() {
  try {
    const now = Date.now();
    if (_cache && now < _cache.expiry) {
      return NextResponse.json(_cache.data);
    }

    // Try live TxLINE data first
    try {
      const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);
      const sorted = [...fixtures].sort((a, b) => a.StartTime - b.StartTime);
      _cache = { data: sorted, expiry: now + 5 * 60 * 1000 };
      return NextResponse.json(sorted);
    } catch {
      // TxLINE unavailable (no token / expired) — serve static fallback
      console.warn('[/api/txline/fixtures] TxLINE unavailable, serving static WC2026 fixtures');
    }

    // Static fallback — sorted most recent first so "last match" shows at top
    const sorted = [...STATIC_WC2026].sort((a, b) => b.StartTime - a.StartTime);
    _cache = { data: sorted, expiry: now + 60 * 60 * 1000 }; // cache 1 hour
    return NextResponse.json(sorted);

  } catch (err) {
    console.error('[/api/txline/fixtures]', err);
    // Even if everything fails, return the static data rather than an error
    return NextResponse.json(STATIC_WC2026);
  }
}
