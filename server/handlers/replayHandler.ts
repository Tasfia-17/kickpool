/**
 * replayHandler — streams TxLINE historical events into a pool room.
 * Register in server/index.ts:
 *   import { replayHandler } from './handlers/replayHandler';
 *   app.post('/api/admin/replay', express.json(), replayHandler(io));
 */
import type { Server } from 'socket.io';
import type { Request, Response } from 'express';
import logger from '../../src/lib/logger';
import {
  getScoreHistory,
  extractGoals,
  isMatchFinalised,
  gameStateLabel,
  type TxLineScoreEvent,
} from '../../src/lib/txline';
import {
  generateAICommentary,
  mapTxLineEventToPunditContext,
} from '../../src/lib/aiPundit';

export function replayHandler(io: Server) {
  return async (req: Request, res: Response) => {
    const { secret, poolId, fixtureId, speedMultiplier = 30 } = req.body as {
      secret: string;
      poolId: string;
      fixtureId: number;
      speedMultiplier?: number;
    };

    const adminSecret = process.env.ADMIN_API_KEY || process.env.NEXTAUTH_SECRET || '';
    if (!adminSecret || secret !== adminSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    logger.info(`[Replay] Pool ${poolId}, fixture ${fixtureId} at ${speedMultiplier}x`);
    res.json({ success: true }); // respond immediately; replay runs async below

    let events: TxLineScoreEvent[];
    try {
      events = await getScoreHistory(fixtureId);
    } catch (err) {
      logger.error('[Replay] Failed to fetch history:', (err as Error).message);
      io.to(`pool:${poolId}`).emit('pundit:commentary', {
        text: `⚠️ Replay failed: ${(err as Error).message}`,
        emoji: '⚠️', intensity: 'medium', aiGenerated: false, ts: Date.now(),
      });
      return;
    }

    if (!events.length) {
      io.to(`pool:${poolId}`).emit('pundit:commentary', {
        text: '⚠️ No historical data available yet (available 6h–2 weeks after match end).',
        emoji: '⚠️', intensity: 'medium', aiGenerated: false, ts: Date.now(),
      });
      return;
    }

    io.to(`pool:${poolId}`).emit('pundit:commentary', {
      text: `🎬 Replaying ${events.length} match events at ${speedMultiplier}× from TxLINE historical feed.`,
      emoji: '🎬', intensity: 'medium', aiGenerated: false, ts: Date.now(),
    });

    const INTERVAL_MS = Math.max(100, Math.round(1000 / speedMultiplier));
    let prevScore: { p1: number; p2: number } = { p1: 0, p2: 0 };
    let prevStats: Record<number, number> = {};

    let participant1 = 'Home';
    let participant2 = 'Away';
    try {
      const { prisma } = await import('../lib/prismaTypes');
      const pool = await prisma.matchPool.findUnique({ where: { id: poolId } });
      if (pool) { participant1 = pool.participant1; participant2 = pool.participant2; }
    } catch { /* use defaults */ }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const goals = extractGoals(event.Stats);

      io.to(`pool:${poolId}`).emit('match:score_update', {
        fixtureId,
        score1:   goals.p1,
        score2:   goals.p2,
        statusId: event.statusId,
        period:   gameStateLabel(event.statusId),
        action:   event.action,
        stats:    event.Stats,
        ts:       Date.now(),
        isReplay: true,
      });

      const punditCtx = mapTxLineEventToPunditContext(
        event, null, participant1, participant2, prevScore, prevStats
      );
      if (punditCtx) {
        io.to(`pool:${poolId}`).emit('match:event', {
          type: punditCtx.eventType, score1: goals.p1, score2: goals.p2, team: punditCtx.team ?? null,
        });
        generateAICommentary(punditCtx)
          .then(c => io.to(`pool:${poolId}`).emit('pundit:commentary', { ...c, ts: Date.now() }))
          .catch(() => { /* skip */ });
      }

      if (isMatchFinalised(event)) {
        setTimeout(() => {
          io.to(`pool:${poolId}`).emit('match:finalised', {
            fixtureId, score1: goals.p1, score2: goals.p2,
            merkleProof: null, distribution: [], ts: Date.now(), isReplay: true,
          });
        }, INTERVAL_MS * 3);
        break;
      }

      prevScore = { p1: goals.p1, p2: goals.p2 };
      prevStats = { ...event.Stats };
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }

    logger.info(`[Replay] Complete for pool ${poolId}`);
  };
}
