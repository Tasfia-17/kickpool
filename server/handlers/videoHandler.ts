/**
 * CinePurr — Video Synchronization Domain Handler
 *
 * Manages real-time video playback synchronization across watch party
 * participants. Implements the Soft Correction algorithm from the PDF
 * to eliminate jarring hard-seeks for minor drift.
 *
 * @see PDF Section 5 — "Algorithmic Drift Correction and State Interpolation"
 *
 * Correction Strategy:
 *   • Drift < 50ms  → In-Sync: playbackRate = 1.0 (no action)
 *   • 50ms–1000ms   → Soft Correction: adjust playbackRate (1.05x / 0.95x)
 *   • Drift > 1000ms → Hard Correction: force currentTime seek
 *
 * Time Synchronization:
 *   Uses NTP-style 4-timestamp model (T1, T2, T3, T4)
 *   with IQR outlier rejection on the client side (clockSync.ts).
 */

import { Server, Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { rooms, isHostOrCoHost } from '../state';
import { checkRateLimitAsync } from '../lib/helpers';
import logger from '../../src/lib/logger';

// ============================================
// DRIFT CORRECTION THRESHOLDS (seconds)
// ============================================

/** Below this threshold, drift is imperceptible to humans */
const DRIFT_IN_SYNC_THRESHOLD = 0.05; // 50ms

/** Above this threshold, a hard seek is required */
const DRIFT_HARD_CORRECTION_THRESHOLD = 1.0; // 1000ms

/** P-Controller proportional gain for playbackRate adjustment */
const CORRECTION_GAIN = 0.1;

/** Maximum playbackRate deviation from 1.0 (prevents chipmunk audio) */
const MAX_RATE_DEVIATION = 0.25;

/** Minimum time between successive progress updates (prevents overwrites) */
const PROGRESS_DEBOUNCE_MS = 1000;

/** Maximum acceptable drift before rejecting a progress update (seconds) */
const MAX_ACCEPTABLE_DRIFT = 30;

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Register all video synchronization event listeners on the given socket.
 * Called once per connection from the entry-point's io.on('connection').
 */
export function registerVideoHandlers(io: Server, socket: Socket): void {
  // ── player:progress — Host heartbeat with Soft Correction ────
  //
  // The host sends periodic progress updates. The server:
  //   1. Validates the sender is host/co-host
  //   2. Checks for reasonable timestamp drift
  //   3. Updates authoritative server state
  //   4. Broadcasts to viewers WITH drift correction metadata
  //
  socket.on(
    'player:progress',
    ({ roomId, timestamp, isPlaying }: { roomId: string; timestamp: number; isPlaying?: boolean }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      // Only accept progress from host or co-host
      const senderUser = room.users.find(u => u.socketId === socket.id);
      if (!senderUser || !isHostOrCoHost(room, senderUser.id)) {
        return; // Silently ignore non-host progress
      }

      // Don't let progress overwrite a recent seek/update
      const timeSinceLastAction = Date.now() - room.lastUpdated;
      if (timeSinceLastAction < PROGRESS_DEBOUNCE_MS) return;

      // Calculate expected time based on server's authoritative state
      const expectedTime = room.isPlaying
        ? room.timestamp + (Date.now() - room.lastUpdated) / 1000
        : room.timestamp;

      // Accept update if within reasonable bounds
      const drift = Math.abs(timestamp - expectedTime);
      if (drift < MAX_ACCEPTABLE_DRIFT) {
        const updatedState = {
          ...room,
          timestamp,
          isPlaying: isPlaying ?? room.isPlaying,
          lastUpdated: Date.now(),
        };
        rooms.set(roomId, updatedState);

        // ── SOFT CORRECTION LOGIC ──────────────────────────────
        // Calculate what each viewer's position SHOULD be and
        // include correction metadata so the client can adjust
        // playbackRate instead of hard-seeking.
        const serverTargetTime = timestamp;
        const syncPayload: Record<string, unknown> = {
          ...updatedState,
          // Include correction hints for the client
          serverTargetTime,
          correctionStrategy: 'none' as 'none' | 'soft' | 'hard',
          suggestedPlaybackRate: 1.0,
        };

        // The drift is computed PER-CLIENT on the client side using
        // their local clockSync offset. The server provides the
        // authoritative timestamp and correction thresholds so the
        // client's drift correction engine can make the decision.
        syncPayload.driftThresholds = {
          inSync: DRIFT_IN_SYNC_THRESHOLD,
          softCorrection: DRIFT_HARD_CORRECTION_THRESHOLD,
          gain: CORRECTION_GAIN,
          maxDeviation: MAX_RATE_DEVIATION,
        };

        // Broadcast to viewers (excluding sender to prevent feedback loops)
        socket.to(roomId).emit('player:sync', syncPayload);
        logger.debug(
          `[PROGRESS] Updated room ${roomId} timestamp to ${timestamp.toFixed(2)}s and synced viewers`
        );
      }
    }
  );

  // ── player:update — Host play/pause state changes ────────────
  socket.on('player:update', ({ roomId, state }: { roomId: string; state: Record<string, unknown> }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Verify sender is host or co-host
    const senderUser = room.users.find(u => u.socketId === socket.id);
    if (!senderUser || !isHostOrCoHost(room, senderUser.id)) {
      logger.debug(`[PLAYER_UPDATE] Blocked non-host update from ${socket.id}`);
      return;
    }

    logger.debug(`[PLAYER_UPDATE] Received update for room ${roomId} from host ${socket.id}`);

    // Update server authority explicitly (prevent room hijacking)
    const newState = {
      ...room,
      isPlaying: typeof state.isPlaying === 'boolean' ? state.isPlaying : room.isPlaying,
      timestamp: typeof state.timestamp === 'number' ? state.timestamp : room.timestamp,
      lastUpdated: Date.now(),
    };
    rooms.set(roomId, newState);

    // Broadcast to everyone EXCEPT sender (prevent feedback loops)
    socket.to(roomId).emit('player:sync', newState);
    logger.debug(
      `[PLAYER_UPDATE] Broadcasted sync to room ${roomId}: playing=${newState.isPlaying}, time=${newState.timestamp?.toFixed(2)}s`
    );
  });

  // ── player:seek — Host seeks to a specific timestamp ─────────
  socket.on('player:seek', ({ roomId, timestamp }: { roomId: string; timestamp: number }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Verify sender is host or co-host
    const senderUser = room.users.find(u => u.socketId === socket.id);
    if (!senderUser || !isHostOrCoHost(room, senderUser.id)) {
      logger.debug(`[SEEK] Blocked non-host seek from ${socket.id}`);
      return;
    }

    // Update room state (forcedSeek is transient, only for the broadcast)
    const updatedState = {
      ...room,
      timestamp,
      lastUpdated: Date.now(),
    };
    rooms.set(roomId, updatedState);

    logger.debug(`[SEEK] Room ${roomId}: Seeking to ${timestamp.toFixed(2)}s`);

    // Broadcast with forcedSeek flag — this is a HARD correction
    // (drift > 1s or explicit user seek) so clients should jump immediately
    socket.to(roomId).emit('player:sync', {
      ...updatedState,
      forcedSeek: true,
      correctionStrategy: 'hard',
    });
  });

  // ── player:request_sync — Newly-ready player requests state ──
  socket.on('player:request_sync', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Calculate live timestamp if video is playing
      const currentTimestamp = room.isPlaying
        ? room.timestamp + (Date.now() - room.lastUpdated) / 1000
        : room.timestamp;

      socket.emit('player:sync', {
        ...room,
        timestamp: currentTimestamp,
        lastUpdated: Date.now(),
        // Include drift correction thresholds for new joiners
        driftThresholds: {
          inSync: DRIFT_IN_SYNC_THRESHOLD,
          softCorrection: DRIFT_HARD_CORRECTION_THRESHOLD,
          gain: CORRECTION_GAIN,
          maxDeviation: MAX_RATE_DEVIATION,
        },
      });
      logger.debug(
        `[SYNC] Sent sync to ${socket.id} for room ${roomId}. Playing: ${room.isPlaying}, Time: ${currentTimestamp.toFixed(2)}s`
      );
    }
  });

  // ── player:buffering — Host broadcasts buffering state ───────
  socket.on(
    'player:buffering',
    ({ roomId, isBuffering }: { roomId: string; isBuffering: boolean }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.find(u => u.socketId === socket.id);
      if (user && isHostOrCoHost(room, user.id)) {
        socket.to(roomId).emit('player:buffering', { isBuffering });
        logger.debug(`[BUFFERING] Room ${roomId}: ${isBuffering ? 'buffering' : 'ready'}`);
      }
    }
  );

  // ── reaction:send — Emoji reactions floating over video ──────
  socket.on('reaction:send', async ({ roomId, emoji }: { roomId: string; emoji: string }) => {
    // Rate limit reactions
    const allowed = await checkRateLimitAsync(socket.id);
    if (!allowed) return;

    // Validate emoji
    if (!emoji || typeof emoji !== 'string' || emoji.length > 4) return;

    // Broadcast to everyone in room INCLUDING sender
    io.to(roomId).emit('reaction:new', {
      emoji,
      senderId: socket.id,
      timestamp: Date.now(),
    });

    logger.debug(`[REACTION] User ${socket.id} sent ${emoji} in room ${roomId}`);
  });

  // ── NTP-style Clock Synchronization ──────────────────────────
  //
  // Legacy ping/pong (backward compatibility)
  socket.on('room:ping', () => {
    socket.emit('room:pong', { serverTime: Date.now() });
  });

  // Precision multi-pass NTP synchronization
  // Returns T2 (server receive) and T3 (server send) alongside client's T1
  // to enable proper 4-timestamp NTP offset calculation on the client.
  socket.on('room:time_sync', ({ t1 }: { t1: number }) => {
    const t2 = Date.now();
    // T3 is captured immediately after T2 — server processing time is negligible
    const t3 = Date.now();
    socket.emit('room:time_sync_reply', { t1, t2, t3 });
  });
}

// ============================================
// CLIENT-SIDE DRIFT CORRECTION REFERENCE
// ============================================
//
// The following function is NOT used server-side — it documents the
// algorithm that the client's VideoPlayer component should implement
// when receiving player:sync events with driftThresholds metadata.
//
// ```typescript
// function applyDriftCorrection(
//   videoElement: HTMLMediaElement,
//   targetTime: number,
//   thresholds: { inSync: number; softCorrection: number; gain: number; maxDeviation: number }
// ) {
//   const drift = targetTime - videoElement.currentTime;
//   const absoluteDrift = Math.abs(drift);
//
//   if (absoluteDrift < thresholds.inSync) {
//     // In-Sync: human eye cannot perceive < 50ms A/V desync
//     videoElement.playbackRate = 1.0;
//   } else if (absoluteDrift < thresholds.softCorrection) {
//     // Soft Correction: P-Controller playbackRate adjustment
//     const correctionFactor = drift * thresholds.gain;
//     const clamped = Math.max(-thresholds.maxDeviation, Math.min(thresholds.maxDeviation, correctionFactor));
//     videoElement.playbackRate = 1.0 + clamped;
//   } else {
//     // Hard Correction: force seek — drift is too large for smooth correction
//     videoElement.currentTime = targetTime;
//     videoElement.playbackRate = 1.0;
//   }
// }
// ```
