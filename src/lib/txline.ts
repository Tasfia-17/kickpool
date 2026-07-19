/**
 * KickPool — TxLINE API Client
 *
 * Handles authentication, fixture snapshots, scores/odds SSE streams,
 * and Merkle proof retrieval for on-chain settlement validation.
 *
 * Auth flow:
 *   1. POST /auth/guest/start → JWT (30-day)
 *   2. POST /api/token/activate (with on-chain txSig + walletSignature) → apiToken
 *
 * All data endpoints require BOTH:
 *   Authorization: Bearer {jwt}
 *   X-Api-Token: {apiToken}
 *
 * Free World Cup tier (Service Level 12) = real-time, no cost.
 */

import logger from './logger';

// ─── Config ────────────────────────────────────────────────────────────────

const TXLINE_BASE = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';
const TXLINE_API  = `${TXLINE_BASE}/api`;
const TXLINE_AUTH = `${TXLINE_BASE}/auth`;

// World Cup competition ID in TxLINE
export const WORLD_CUP_COMPETITION_ID = 15;

// World Cup Final fixture (Spain vs Argentina)
export const WORLD_CUP_FINAL_FIXTURE_ID = 18257739;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TxLineFixture {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  FixtureGroupId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
}

export interface TxLineScoreEvent {
  seq: number;
  ts: number;
  gameState: number;
  statusId: number;
  action: string;
  period: number;
  Stats: Record<string, number>;
  Data?: Record<string, unknown>;
}

export interface TxLineOddsEvent {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  BookmakerId: number;
  SuperOddsType: string;
  InRunning: boolean;
  GameState: string;
  MarketParameters: string;
  MarketPeriod: string;
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
}

export interface TxLineMerkleProof {
  summary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    eventStatsSubTreeRoot: string;
  };
  subTreeProof: Array<{ hash: string; isRightSibling: boolean }>;
  mainTreeProof: Array<{ hash: string; isRightSibling: boolean }>;
  eventStatRoot: string;
  statToProve: Record<string, unknown>;
  statProof: Array<{ hash: string; isRightSibling: boolean }>;
}

// Soccer stat key constants
export const STAT_KEYS = {
  P1_GOALS:          1,
  P2_GOALS:          2,
  P1_YELLOW_CARDS:   3,
  P2_YELLOW_CARDS:   4,
  P1_RED_CARDS:      5,
  P2_RED_CARDS:      6,
  P1_CORNERS:        7,
  P2_CORNERS:        8,
  // Period prefixes: 0=Total, 1000=H1, 3000=H2
  P1_GOALS_H1:    1001,
  P2_GOALS_H1:    2001,
  P1_GOALS_H2:    3001,
  P2_GOALS_H2:    4001,
} as const;

// Game phases
export const GAME_STATE = {
  NOT_STARTED:  1,
  FIRST_HALF:   2,
  HALF_TIME:    3,
  SECOND_HALF:  4,
  FULL_TIME:    5,
  EXTRA_TIME_1: 7,
  EXTRA_TIME_2: 9,
  PENALTIES:    12,
  FINAL:        100,
} as const;

export function gameStateLabel(statusId: number): string {
  const labels: Record<number, string> = {
    1:  'Not Started',
    2:  '1st Half',
    3:  'Half Time',
    4:  '2nd Half',
    5:  'Full Time',
    6:  'ET 1st Half',
    7:  'ET 1st Half',
    8:  'ET Half Time',
    9:  'ET 2nd Half',
    10: 'After Extra Time',
    11: 'Pen. Shootout',
    12: 'Pen. Shootout',
    13: 'After Penalties',
    100: 'Final',
  };
  return labels[statusId] ?? `Period ${statusId}`;
}

// ─── Auth State ─────────────────────────────────────────────────────────────

let _jwt: string | null = null;
let _apiToken: string | null = null;
let _jwtExpiresAt = 0;

export async function getGuestJwt(): Promise<string> {
  const now = Date.now();
  // Refresh if missing or within 1 hour of expiry
  if (!_jwt || now > _jwtExpiresAt - 3_600_000) {
    const res = await fetch(`${TXLINE_AUTH}/guest/start`, { method: 'POST' });
    if (!res.ok) throw new Error(`TxLINE guest start failed: ${res.status}`);
    const data = await res.json() as { token: string };
    _jwt = data.token;
    // JWT is valid 30 days; store expiry
    _jwtExpiresAt = now + 30 * 24 * 3600 * 1000;
    logger.info('[TxLINE] Guest JWT acquired');
  }
  return _jwt!;
}

/**
 * Activate subscription using an on-chain Solana tx + wallet signature.
 * For the free World Cup tier, call with SERVICE_LEVEL_ID = 12.
 *
 * In dev/demo mode (no real wallet), we use TXLINE_API_TOKEN from env directly.
 */
export async function activateToken(params: {
  txSig: string;
  walletSignature: string;
  leagues?: string[];
}): Promise<string> {
  const jwt = await getGuestJwt();
  const body = {
    txSig: params.txSig,
    walletSignature: params.walletSignature,
    leagues: params.leagues ?? [],
  };
  const res = await fetch(`${TXLINE_API}/token/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TxLINE token activate failed: ${res.status}`);
  const token = await res.text();
  _apiToken = token.trim();
  logger.info('[TxLINE] API token activated');
  return _apiToken;
}

export function setApiToken(token: string): void {
  _apiToken = token;
}

async function authHeaders(): Promise<HeadersInit> {
  const jwt = await getGuestJwt();
  const apiToken = _apiToken ?? process.env.TXLINE_API_TOKEN ?? '';
  if (!apiToken) {
    logger.warn('[TxLINE] No API token — requests may fail. Set TXLINE_API_TOKEN in .env');
  }
  return {
    Authorization: `Bearer ${jwt}`,
    'X-Api-Token': apiToken,
  };
}

// ─── Fixture Endpoints ──────────────────────────────────────────────────────

/**
 * GET /api/fixtures/snapshot — all fixtures, optionally filtered by competition.
 */
export async function getFixturesSnapshot(competitionId?: number): Promise<TxLineFixture[]> {
  const headers = await authHeaders();
  const url = competitionId
    ? `${TXLINE_API}/fixtures/snapshot?competitionId=${competitionId}`
    : `${TXLINE_API}/fixtures/snapshot`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`[TxLINE] fixtures/snapshot failed: ${res.status}`);
  return res.json() as Promise<TxLineFixture[]>;
}

/**
 * Get a single fixture by ID from the snapshot.
 */
export async function getFixtureById(fixtureId: number): Promise<TxLineFixture | null> {
  try {
    const fixtures = await getFixturesSnapshot();
    return fixtures.find(f => f.FixtureId === fixtureId) ?? null;
  } catch (err) {
    logger.error('[TxLINE] getFixtureById error:', err);
    return null;
  }
}

// ─── Scores Endpoints ───────────────────────────────────────────────────────

/**
 * GET /api/scores/snapshot/{fixtureId} — latest score snapshot.
 */
export async function getScoreSnapshot(fixtureId: number): Promise<TxLineScoreEvent[]> {
  const headers = await authHeaders();
  const res = await fetch(`${TXLINE_API}/scores/snapshot/${fixtureId}`, { headers });
  if (!res.ok) throw new Error(`[TxLINE] scores/snapshot failed: ${res.status}`);
  return res.json() as Promise<TxLineScoreEvent[]>;
}

/**
 * GET /api/scores/historical/{fixtureId} — full sequence (6h–2 weeks post-match).
 */
export async function getScoreHistory(fixtureId: number): Promise<TxLineScoreEvent[]> {
  const headers = await authHeaders();
  const res = await fetch(`${TXLINE_API}/scores/historical/${fixtureId}`, { headers });
  if (!res.ok) throw new Error(`[TxLINE] scores/historical failed: ${res.status}`);
  return res.json() as Promise<TxLineScoreEvent[]>;
}

/**
 * GET /api/scores/{fixtureId}/{statKey}/proof — Merkle proof for settlement.
 * seq=0 is never valid; use observed seq from real score records.
 */
export async function getScoreProof(
  fixtureId: number,
  statKey: number,
  seq: number
): Promise<TxLineMerkleProof> {
  const headers = await authHeaders();
  const res = await fetch(
    `${TXLINE_API}/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${statKey}`,
    { headers }
  );
  if (!res.ok) throw new Error(`[TxLINE] scores/proof failed: ${res.status}`);
  return res.json() as Promise<TxLineMerkleProof>;
}

/**
 * Multi-stat proof for settlement (V2).
 */
export async function getMultiStatProof(
  fixtureId: number,
  statKeys: number[],
  seq: number
): Promise<TxLineMerkleProof> {
  const headers = await authHeaders();
  const keyParam = statKeys.join(',');
  const res = await fetch(
    `${TXLINE_API}/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${keyParam}`,
    { headers }
  );
  if (!res.ok) throw new Error(`[TxLINE] scores/multiproof failed: ${res.status}`);
  return res.json() as Promise<TxLineMerkleProof>;
}

// ─── Odds Endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/odds/snapshot/{fixtureId} — latest odds snapshot.
 */
export async function getOddsSnapshot(fixtureId: number): Promise<TxLineOddsEvent[]> {
  const headers = await authHeaders();
  const res = await fetch(`${TXLINE_API}/odds/snapshot/${fixtureId}`, { headers });
  if (!res.ok) throw new Error(`[TxLINE] odds/snapshot failed: ${res.status}`);
  return res.json() as Promise<TxLineOddsEvent[]>;
}

// ─── SSE Stream Manager ─────────────────────────────────────────────────────

export type ScoreStreamEvent = TxLineScoreEvent & { FixtureId: number };
export type OddsStreamEvent  = TxLineOddsEvent;

export interface TxLineStreamCallbacks {
  onScore?: (event: ScoreStreamEvent) => void;
  onOdds?:  (event: OddsStreamEvent) => void;
  onError?: (err: Error) => void;
  onConnect?: () => void;
}

// NOTE: No module-level singletons — each pool gets per-call controllers.
// Old module-level vars removed; startStreams now creates fresh controllers per call.

async function consumeSSE(
  url: string,
  headers: HeadersInit,
  onData: (data: string) => void,
  onError: (err: Error) => void,
  signal: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: { ...headers, Accept: 'text/event-stream', 'Cache-Control': 'no-cache', 'Accept-Encoding': 'gzip' },
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE connect failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let dataLine = '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          dataLine = line.slice(6).trim();
        } else if (line === '' && dataLine) {
          if (dataLine !== 'heartbeat' && dataLine !== '') {
            onData(dataLine);
          }
          dataLine = '';
        }
      }
    }
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      onError(err as Error);
    }
  }
}

/**
 * Start both score and odds SSE streams.
 * FIXED: creates per-call AbortControllers so multiple pools stream simultaneously.
 * Returns a cleanup function specific to this call.
 */
export async function startStreams(
  fixtureId: number,
  callbacks: TxLineStreamCallbacks
): Promise<() => void> {
  // Per-call controllers — no global singleton clash between pools
  const scoreController = new AbortController();
  const oddsController  = new AbortController();

  const headers = await authHeaders();
  callbacks.onConnect?.();

  // Scores stream
  const runScoreStream = async () => {
    while (!scoreController.signal.aborted) {
      logger.info(`[TxLINE] Connecting scores stream for fixture ${fixtureId}`);
      await consumeSSE(
        `${TXLINE_API}/scores/stream`,
        headers,
        (data) => {
          try {
            const event = JSON.parse(data) as ScoreStreamEvent;
            // Filter: only forward events for this fixture
            if (!event.FixtureId || event.FixtureId === fixtureId) {
              callbacks.onScore?.(event);
            }
          } catch { /* ignore parse errors */ }
        },
        (err) => logger.warn(`[TxLINE] Score stream error (fixture ${fixtureId}), reconnecting:`, err.message),
        scoreController.signal
      );
      if (!scoreController.signal.aborted) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };

  // Odds stream
  const runOddsStream = async () => {
    while (!oddsController.signal.aborted) {
      logger.info(`[TxLINE] Connecting odds stream for fixture ${fixtureId}`);
      await consumeSSE(
        `${TXLINE_API}/odds/stream`,
        headers,
        (data) => {
          try {
            const event = JSON.parse(data) as OddsStreamEvent;
            if (!event.FixtureId || event.FixtureId === fixtureId) {
              callbacks.onOdds?.(event);
            }
          } catch { /* ignore parse errors */ }
        },
        (err) => logger.warn(`[TxLINE] Odds stream error (fixture ${fixtureId}), reconnecting:`, err.message),
        oddsController.signal
      );
      if (!oddsController.signal.aborted) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };

  runScoreStream();
  runOddsStream();

  // Return per-call cleanup
  return () => {
    scoreController.abort();
    oddsController.abort();
    logger.info(`[TxLINE] Streams stopped for fixture ${fixtureId}`);
  };
}

export function stopStreams(): void {
  // no-op: streams are now stopped via per-call cleanup returned by startStreams()
}

// ─── Score Helpers ──────────────────────────────────────────────────────────

export function extractGoals(stats: Record<string, number>): { p1: number; p2: number } {
  return {
    p1: stats[STAT_KEYS.P1_GOALS] ?? 0,
    p2: stats[STAT_KEYS.P2_GOALS] ?? 0,
  };
}

export function isMatchFinalised(event: TxLineScoreEvent): boolean {
  return event.action === 'game_finalised' && event.statusId === 100 && event.period === 100;
}

export function extractResult1x2(odds: TxLineOddsEvent | null): {
  home: number | null;
  draw: number | null;
  away: number | null;
} {
  if (!odds) return { home: null, draw: null, away: null };
  const idx1x2 = odds.PriceNames.findIndex(n => n === 'Home' || n === '1');
  const idxDraw = odds.PriceNames.findIndex(n => n === 'Draw' || n === 'X');
  const idxAway = odds.PriceNames.findIndex(n => n === 'Away' || n === '2');
  return {
    home: idx1x2 >= 0 ? (odds.Prices[idx1x2] ?? null) : null,
    draw: idxDraw >= 0 ? (odds.Prices[idxDraw] ?? null) : null,
    away: idxAway >= 0 ? (odds.Prices[idxAway] ?? null) : null,
  };
}
