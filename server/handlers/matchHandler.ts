/**
 * KickPool — Match Handler
 *
 * Socket.io domain handler for live match data:
 *   - Manages per-pool TxLINE SSE stream subscriptions
 *   - Broadcasts score/odds updates to pool Socket.io rooms
 *   - Triggers AI Pundit commentary on notable events
 *   - Handles match finalisation + settlement trigger
 *
 * Each pool room uses Socket.io room ID: `pool:{poolId}`
 * Clients join via the standard room:join flow — reused from CinePurr.
 *
 * New socket events emitted by this handler:
 *   match:score_update  → { fixtureId, score1, score2, statusId, period, stats }
 *   match:odds_update   → { fixtureId, homeOdds, drawOdds, awayOdds, inRunning }
 *   match:event         → { type, score1, score2, commentary, emoji, intensity }
 *   match:finalised     → { fixtureId, score1, score2, merkleProof, proof }
 *   pundit:commentary   → { text, emoji, intensity, aiGenerated, ts }
 */

import { Server, Socket } from 'socket.io';
import logger from '../../src/lib/logger';
import {
  startStreams,
  stopStreams,
  getScoreSnapshot,
  getOddsSnapshot,
  getMultiStatProof,
  extractGoals,
  extractResult1x2,
  isMatchFinalised,
  STAT_KEYS,
  gameStateLabel,
  type TxLineScoreEvent,
  type TxLineOddsEvent,
} from '../../src/lib/txline';
import {
  generateAICommentary,
  mapTxLineEventToPunditContext,
} from '../../src/lib/aiPundit';
import { prisma } from '../lib/prismaTypes';

// ─── In-memory per-pool match state ─────────────────────────────────────────

interface PoolMatchState {
  fixtureId:    number;
  poolId:       string;
  participant1: string;
  participant2: string;
  score1:       number;
  score2:       number;
  statusId:     number;
  period:       number;
  lastSeq:      number;
  latestOdds:   TxLineOddsEvent | null;
  stopStream:   (() => void) | null;
  finalised:    boolean;
}

const poolMatchStates = new Map<string, PoolMatchState>();

// ─── Handler Registration ────────────────────────────────────────────────────

export function registerMatchHandlers(io: Server, socket: Socket): void {
  // pool:subscribe — client joins a pool room and starts receiving match events
  socket.on('pool:subscribe', async ({ poolId }: { poolId: string }) => {
    const roomId = `pool:${poolId}`;
    socket.join(roomId);

    // If we already have state for this pool, send snapshot immediately
    const existing = poolMatchStates.get(poolId);
    if (existing) {
      socket.emit('match:score_update', {
        fixtureId: existing.fixtureId,
        score1:    existing.score1,
        score2:    existing.score2,
        statusId:  existing.statusId,
        period:    gameStateLabel(existing.statusId),
        finalised: existing.finalised,
      });
      if (existing.latestOdds) {
        const odds = extractResult1x2(existing.latestOdds);
        socket.emit('match:odds_update', {
          fixtureId: existing.fixtureId,
          ...odds,
          inRunning: existing.latestOdds.InRunning,
        });
      }
    } else {
      // Bootstrap state for this pool
      await bootstrapPoolMatchStream(io, poolId);
    }
  });

  // pool:unsubscribe
  socket.on('pool:unsubscribe', ({ poolId }: { poolId: string }) => {
    socket.leave(`pool:${poolId}`);
  });

  // pool:request_snapshot — manual refresh
  socket.on('pool:request_snapshot', async ({ poolId }: { poolId: string }) => {
    const state = poolMatchStates.get(poolId);
    if (!state) return;
    try {
      const events = await getScoreSnapshot(state.fixtureId);
      const latest = events[events.length - 1];
      if (!latest) return;
      const goals = extractGoals(latest.Stats);
      state.score1 = goals.p1;
      state.score2 = goals.p2;
      state.statusId = latest.statusId;
      state.period   = latest.period;
      socket.emit('match:score_update', {
        fixtureId: state.fixtureId,
        score1:    goals.p1,
        score2:    goals.p2,
        statusId:  latest.statusId,
        period:    gameStateLabel(latest.statusId),
      });
    } catch (err) {
      logger.warn('[MatchHandler] snapshot refresh failed:', (err as Error).message);
    }
  });
}

// ─── Pool bootstrap ──────────────────────────────────────────────────────────

export async function bootstrapPoolMatchStream(io: Server, poolId: string): Promise<void> {
  if (poolMatchStates.has(poolId)) {
    logger.info(`[MatchHandler] Pool ${poolId} already streaming`);
    return;
  }

  // Load pool from DB
  const pool = await prisma.matchPool.findUnique({
    where: { id: poolId },
  });
  if (!pool) {
    logger.warn(`[MatchHandler] Pool ${poolId} not found in DB`);
    return;
  }

  const state: PoolMatchState = {
    fixtureId:    pool.fixtureId,
    poolId,
    participant1: pool.participant1,
    participant2: pool.participant2,
    score1:       0,
    score2:       0,
    statusId:     1,
    period:       1,
    lastSeq:      0,
    latestOdds:   null,
    stopStream:   null,
    finalised:    pool.status === 'SETTLED',
  };
  poolMatchStates.set(poolId, state);

  // Load initial snapshot
  try {
    const events = await getScoreSnapshot(pool.fixtureId);
    const latest = events[events.length - 1];
    if (latest) {
      const goals = extractGoals(latest.Stats);
      state.score1   = goals.p1;
      state.score2   = goals.p2;
      state.statusId = latest.statusId;
      state.period   = latest.period;
      state.lastSeq  = latest.seq;
    }

    const odds = await getOddsSnapshot(pool.fixtureId);
    const result1x2 = odds.find(o => o.SuperOddsType === 'result' || o.PriceNames.includes('Home'));
    if (result1x2) state.latestOdds = result1x2;

    logger.info(`[MatchHandler] Pool ${poolId} snapshot loaded: ${state.score1}–${state.score2}`);
  } catch (err) {
    logger.warn('[MatchHandler] Initial snapshot failed:', (err as Error).message);
  }

  if (state.finalised) {
    logger.info(`[MatchHandler] Pool ${poolId} already settled, skipping stream`);
    return;
  }

  // Start SSE streams
  const stop = await startStreams(pool.fixtureId, {
    onConnect: () => {
      logger.info(`[MatchHandler] SSE streams connected for pool ${poolId}`);
    },

    onScore: async (event) => {
      const prevScore = { p1: state.score1, p2: state.score2 };
      const goals = extractGoals(event.Stats);

      // Update state
      const prevStatusId = state.statusId;
      state.score1   = goals.p1;
      state.score2   = goals.p2;
      state.statusId = event.statusId;
      state.period   = event.period;
      state.lastSeq  = event.seq;

      // Broadcast score update
      io.to(`pool:${poolId}`).emit('match:score_update', {
        fixtureId: state.fixtureId,
        score1:    goals.p1,
        score2:    goals.p2,
        statusId:  event.statusId,
        period:    gameStateLabel(event.statusId),
        action:    event.action,
        stats:     event.Stats,
        ts:        event.ts,
      });

      // Determine notable events and generate commentary
      const punditCtx = mapTxLineEventToPunditContext(
        event,
        state.latestOdds,
        state.participant1,
        state.participant2,
        prevScore
      );

      if (punditCtx) {
        logger.info(`[Pundit] Notable event: ${punditCtx.eventType} in pool ${poolId}`);

        // Emit raw event type for UI reactions (floating emojis etc.)
        io.to(`pool:${poolId}`).emit('match:event', {
          type:  punditCtx.eventType,
          score1: goals.p1,
          score2: goals.p2,
          team:   punditCtx.team ?? null,
        });

        // Generate and broadcast AI commentary async
        generateAICommentary(punditCtx).then(async (commentary) => {
          io.to(`pool:${poolId}`).emit('pundit:commentary', {
            ...commentary,
            ts: Date.now(),
          });

          // Persist commentary to DB
          try {
            await prisma.aICommentary.create({
              data: {
                poolId,
                eventType:  punditCtx.eventType,
                eventData:  JSON.stringify(event),
                commentary: commentary.text,
                oddsContext: state.latestOdds ? JSON.stringify(state.latestOdds) : null,
              },
            });
          } catch (dbErr) {
            logger.warn('[MatchHandler] Failed to persist commentary:', (dbErr as Error).message);
          }
        }).catch(err => {
          logger.warn('[Pundit] Commentary generation failed:', (err as Error).message);
        });
      }

      // Check for match finalisation
      if (isMatchFinalised(event) && !state.finalised) {
        state.finalised = true;
        logger.info(`[MatchHandler] Match FINALISED for pool ${poolId}: ${goals.p1}–${goals.p2}`);
        await handleMatchFinalised(io, state, event);
      }
    },

    onOdds: (event) => {
      // Keep latest 1x2 odds
      if (event.PriceNames.includes('Home') || event.SuperOddsType === 'result') {
        state.latestOdds = event;
      }

      const odds = extractResult1x2(event);

      io.to(`pool:${poolId}`).emit('match:odds_update', {
        fixtureId: event.FixtureId,
        homeOdds:  odds.home,
        drawOdds:  odds.draw,
        awayOdds:  odds.away,
        inRunning: event.InRunning,
        marketType: event.SuperOddsType,
        ts:        event.Ts,
      });

      // Emit pundit comment for significant odds shifts
      if (event.InRunning && odds.home && odds.away) {
        const spread = Math.abs((odds.home ?? 1) - (odds.away ?? 1));
        if (spread > 1.5) {
          generateAICommentary({
            eventType:    'odds_shift',
            participant1: state.participant1,
            participant2: state.participant2,
            score1:       state.score1,
            score2:       state.score2,
            period:       gameStateLabel(state.statusId),
            homeOdds:     odds.home,
            drawOdds:     odds.draw,
            awayOdds:     odds.away,
          }).then(commentary => {
            io.to(`pool:${poolId}`).emit('pundit:commentary', {
              ...commentary,
              ts: Date.now(),
            });
          }).catch(() => { /* silently skip */ });
        }
      }
    },

    onError: (err) => {
      logger.error('[MatchHandler] Stream error:', err.message);
    },
  });

  state.stopStream = stop;

  // Polling fallback: if game_finalised SSE event is missed,
  // poll score snapshot every 60s and check for finalisation.
  const pollInterval = setInterval(async () => {
    if (state.finalised) { clearInterval(pollInterval); return; }
    try {
      const events = await getScoreSnapshot(state.fixtureId);
      const latest = events[events.length - 1];
      if (latest && isMatchFinalised(latest) && !state.finalised) {
        logger.info(`[MatchHandler] Finalisation detected via polling for pool ${poolId}`);
        state.finalised = true;
        await handleMatchFinalised(io, state, latest);
        clearInterval(pollInterval);
      }
    } catch { /* ignore poll errors */ }
  }, 60_000);

  // Clean up poll interval after 3 hours (match + ET + penalties)
  setTimeout(() => clearInterval(pollInterval), 3 * 3600 * 1000);
}

// ─── Settlement ──────────────────────────────────────────────────────────────

async function handleMatchFinalised(
  io: Server,
  state: PoolMatchState,
  finalEvent: TxLineScoreEvent
): Promise<void> {
  const { poolId, fixtureId, score1, score2, lastSeq } = state;

  let merkleProofJson: string | null = null;
  let proof: unknown = null;

  // Fetch Merkle proof from TxLINE
  try {
    if (lastSeq > 0) {
      proof = await getMultiStatProof(
        fixtureId,
        [STAT_KEYS.P1_GOALS, STAT_KEYS.P2_GOALS],
        lastSeq
      );
      merkleProofJson = JSON.stringify(proof);
      logger.info(`[MatchHandler] Merkle proof fetched for pool ${poolId}`);
    }
  } catch (err) {
    logger.warn('[MatchHandler] Merkle proof fetch failed:', (err as Error).message);
  }

  // Update pool in DB
  try {
    await prisma.matchPool.update({
      where: { id: poolId },
      data: {
        status:       'SETTLED',
        finalScore1:  score1,
        finalScore2:  score2,
        merkleProof:  merkleProofJson,
      },
    });
  } catch (err) {
    logger.warn('[MatchHandler] DB update failed:', (err as Error).message);
  }

  // Calculate settlement
  const { calculateSettlementScores, distributePrize } = await import('../../src/lib/solana');

  try {
    const pool = await prisma.matchPool.findUnique({
      where: { id: poolId },
      include: { entries: true },
    });

    if (!pool) return;

    const scores = calculateSettlementScores({
      p1Goals: score1,
      p2Goals: score2,
      entries: pool.entries.map(e => ({
        userId:          e.userId,
        walletAddress:   e.walletAddress,
        predictedWinner: e.predictedWinner,
        predictedScore1: e.predictedScore1,
        predictedScore2: e.predictedScore2,
        entryFeePaid:    e.entryFeePaid,
      })),
      prizePool: pool.prizePool,
    });

    const distribution = distributePrize(scores, pool.prizePool);

    // Update DB entries with prize amounts
    for (const dist of distribution) {
      await prisma.poolEntry.updateMany({
        where: { poolId, userId: dist.userId },
        data: {
          prizeWon:   dist.prizeWon,
          rank:       dist.rank,
          finalScore: scores.find(s => s.userId === dist.userId)?.points ?? 0,
        },
      });
    }

    // Broadcast finalisation to all pool members
    io.to(`pool:${poolId}`).emit('match:finalised', {
      fixtureId,
      score1,
      score2,
      merkleProof: proof,
      distribution: distribution.map(d => ({
        userId:    d.userId,
        prizeWon:  d.prizeWon,
        rank:      d.rank,
      })),
      ts: Date.now(),
    });

    logger.info(`[MatchHandler] Settlement broadcast complete for pool ${poolId}`);
  } catch (err) {
    logger.error('[MatchHandler] Settlement calculation failed:', err);
    // Still broadcast finalisation with score
    io.to(`pool:${poolId}`).emit('match:finalised', {
      fixtureId,
      score1,
      score2,
      merkleProof: proof,
      ts: Date.now(),
    });
  }

  // Stop streams
  state.stopStream?.();
  state.stopStream = null;
}

// ─── Server startup bootstrap ────────────────────────────────────────────────

/**
 * Call this from server/index.ts after io is created.
 * Bootstraps SSE streams for all LIVE or PENDING pools that have a match today.
 */
export async function bootstrapAllActivePools(io: Server): Promise<void> {
  try {
    const activePools = await prisma.matchPool.findMany({
      where: { status: { in: ['PENDING', 'LIVE'] } },
    });

    logger.info(`[MatchHandler] Bootstrapping ${activePools.length} active pools`);

    for (const pool of activePools) {
      await bootstrapPoolMatchStream(io, pool.id).catch(err => {
        logger.warn(`[MatchHandler] Bootstrap failed for pool ${pool.id}:`, err.message);
      });
    }
  } catch (err) {
    logger.warn('[MatchHandler] bootstrapAllActivePools failed:', (err as Error).message);
  }
}
