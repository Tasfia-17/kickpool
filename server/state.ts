/**
 * CinePurr Server — Centralized State Management
 *
 * All mutable server state lives here. Handlers and middleware import
 * from this module instead of declaring global Maps. This ensures:
 *   1. Single ownership of shared state
 *   2. Controlled mutation via helper functions
 *   3. Clean testability (can reset state in tests)
 *   4. Compatibility with future Redis-backed state (horizontal scaling)
 */

import type { Server } from 'socket.io';
import type {
  RoomState,
  RoomUser,
  GameRoom,
  WatchTrackingEntry,
  VipCacheEntry,
  PrismaError,
} from './types';
import { prisma } from './lib/prismaTypes';
import logger from '../src/lib/logger';

// ============================================
// PRIMARY STATE MAPS
// ============================================

/** Active watch-party rooms — authoritative in-memory state */
export const rooms = new Map<string, RoomState>();

/** userId → socketId mapping for direct messaging & presence */
export const userSockets = new Map<string, string>();

/** Multiplayer game rooms */
export const gameRooms = new Map<string, GameRoom>();

// ============================================
// SECONDARY STATE MAPS
// ============================================

/** Per-socket watch time tracking (updated every 60s) */
export const userWatchTracking = new Map<string, WatchTrackingEntry>();

/** VIP info cache per userId (TTL-based) */
export const userVipCache = new Map<string, VipCacheEntry>();
export const USER_VIP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Dedup room join XP — key: `userId-roomId`, value: timestamp */
export const lastRoomJoins = new Map<string, number>();
export const ROOM_JOIN_COOLDOWN = 5 * 60 * 1000; // 5 minutes

/** Scheduled room deletion timeouts */
export const scheduledDeletions = new Map<string, NodeJS.Timeout>();

/** Debounced room count DB writes */
export const roomCountDirty = new Map<string, number>();
export const roomCountTimeouts = new Map<string, NodeJS.Timeout>();
export const ROOM_COUNT_DEBOUNCE_MS = 10 * 1000; // 10 seconds

// ============================================
// RATE LIMITING CONFIG
// ============================================

export const RATE_LIMIT_WINDOW = 10000;  // 10 seconds
export const RATE_LIMIT_MAX = 10;        // max 10 messages per window
export const VIDEO_CHANGE_WINDOW = 60000; // 1 minute
export const VIDEO_CHANGE_MAX = 5;        // max 5 changes per minute

// ============================================
// ROOM HELPERS
// ============================================

/** Check if a userId is host or co-host of a room */
export function isHostOrCoHost(room: RoomState, userId: string): boolean {
  return room.hostId === userId || (room.coHostIds || []).includes(userId);
}

/** Find the room a socket is currently in */
export function findRoomBySocket(socketId: string): { roomId: string; room: RoomState } | null {
  for (const [roomId, room] of Array.from(rooms.entries())) {
    if (room.users.some((u: { socketId: string }) => u.socketId === socketId)) {
      return { roomId, room };
    }
  }
  return null;
}

/** Get or initialize a room's in-memory state */
export function getOrCreateRoom(roomId: string, defaults?: Partial<RoomState>): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      isPlaying: false,
      timestamp: 0,
      lastUpdated: Date.now(),
      currentVideo: { url: '', title: '', provider: 'youtube' },
      users: [],
      hostId: undefined,
      coHostIds: [],
      queue: [],
      typingUsers: new Set(),
      ...defaults,
    };
    rooms.set(roomId, room);
  }
  return room;
}

/** Remove a user from a room by socketId. Returns the removed user or null. */
export function removeUserFromRoom(roomId: string, socketId: string): RoomUser | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const idx = room.users.findIndex(u => u.socketId === socketId);
  if (idx === -1) return null;

  const [removed] = room.users.splice(idx, 1);
  return removed;
}

// ============================================
// SCHEDULED DELETION
// ============================================

/** Cancel a pending room deletion (e.g. when a user joins) */
export function cancelRoomDeletion(roomId: string): void {
  if (scheduledDeletions.has(roomId)) {
    clearTimeout(scheduledDeletions.get(roomId)!);
    scheduledDeletions.delete(roomId);
    logger.debug(`[CLEANUP] Cancelled scheduled deletion for room ${roomId}`);
  }
}

/** Schedule a room for deletion after 1 minute of being empty */
export function scheduleRoomDeletion(roomId: string): void {
  // Clear any existing scheduled deletion
  cancelRoomDeletion(roomId);

  // Cancel any pending room count updates (prevent P2025 errors)
  if (roomCountTimeouts.has(roomId)) {
    const timeout = roomCountTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      roomCountTimeouts.delete(roomId);
      roomCountDirty.delete(roomId);
      logger.debug(`[CLEANUP] Cancelled pending count update for room ${roomId} (scheduled for deletion)`);
    }
  }

  logger.info(`[CLEANUP] Room ${roomId} is empty. Scheduling deletion in 1 minute...`);

  const timeout = setTimeout(async () => {
    const room = rooms.get(roomId);

    // Only delete if still empty
    if (!room || room.users.length === 0) {
      try {
        const roomExists = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });

        if (roomExists) {
          // Delete related records
          await prisma.message.deleteMany({ where: { roomId } }).catch(() => {});
          await prisma.favoriteRoom.deleteMany({ where: { roomId } }).catch(() => {});
          await prisma.watchHistory.deleteMany({ where: { roomId } }).catch(() => {});

          try {
            await prisma.room.delete({ where: { id: roomId } });
            logger.info(`[CLEANUP] Deleted empty room: ${roomId}`);
          } catch (deleteError: unknown) {
            if ((deleteError as PrismaError).code !== 'P2025') {
              throw deleteError;
            }
            logger.debug(`[CLEANUP] Room ${roomId} was already deleted`);
          }
        }
      } catch (error: unknown) {
        if ((error as PrismaError).code !== 'P2025') {
          logger.error(`[CLEANUP] Error deleting room ${roomId}:`, error);
        }
      }

      // Always clean up memory
      rooms.delete(roomId);
      scheduledDeletions.delete(roomId);
    } else {
      logger.debug(`[CLEANUP] Room ${roomId} has users again, cancelling deletion`);
      scheduledDeletions.delete(roomId);
    }
  }, 60 * 1000);

  scheduledDeletions.set(roomId, timeout);
}

// ============================================
// DEBOUNCED ROOM COUNT (DB WRITES)
// ============================================

/** Defer room count DB writes to reduce frequency (debounced per room) */
export function updateRoomCount(roomId: string, count: number): void {
  roomCountDirty.set(roomId, count);

  // Clear existing timeout
  if (roomCountTimeouts.has(roomId)) {
    const oldTimeout = roomCountTimeouts.get(roomId);
    if (oldTimeout) clearTimeout(oldTimeout);
  }

  const timeout = setTimeout(async () => {
    const newCount = roomCountDirty.get(roomId) ?? count;
    roomCountDirty.delete(roomId);
    roomCountTimeouts.delete(roomId);

    // Skip if room is scheduled for deletion
    if (scheduledDeletions.has(roomId)) {
      logger.debug(`[ROOM_COUNT] Room ${roomId} is scheduled for deletion, skipping count update`);
      return;
    }

    try {
      const roomExists = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
      if (!roomExists) {
        logger.debug(`[ROOM_COUNT] Room ${roomId} no longer exists, skipping count update`);
        return;
      }
      await prisma.room.update({ where: { id: roomId }, data: { onlineCount: newCount } });
      logger.debug(`[ROOM_COUNT] Updated room ${roomId} count to ${newCount}`);
    } catch (error: unknown) {
      if ((error as PrismaError).code === 'P2025') {
        logger.debug(`[ROOM_COUNT] Room ${roomId} not found (likely deleted), skipping`);
      } else {
        logger.warn(`[ROOM_COUNT] Could not update room ${roomId} count:`, (error as Error).message || error);
      }
    }
  }, ROOM_COUNT_DEBOUNCE_MS);

  roomCountTimeouts.set(roomId, timeout);
}

// ============================================
// ROOM LIST BROADCAST (replaces client polling)
// ============================================

let roomListBroadcastTimeout: NodeJS.Timeout | null = null;
const ROOM_LIST_BROADCAST_DEBOUNCE_MS = 2000;

/** Debounced broadcast of the public room list to all connected sockets */
export function debouncedBroadcastRoomList(io: Server): void {
  if (roomListBroadcastTimeout) clearTimeout(roomListBroadcastTimeout);

  roomListBroadcastTimeout = setTimeout(async () => {
    try {
      const publicRooms = await prisma.room.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          name: true,
          currentVideoTitle: true,
          onlineCount: true,
          maxUsers: true,
          _count: { select: { messages: true } },
        },
        orderBy: { onlineCount: 'desc' },
        take: 50,
      });

      // Override stale DB count with live in-memory count
      for (const room of publicRooms) {
        const memRoom = rooms.get(room.id);
        if (memRoom) {
          (room as any).onlineCount = memRoom.users.length;
        }
      }

      io.emit('rooms:list', publicRooms);
    } catch (err) {
      logger.debug('[ROOMS] Failed to broadcast room list:', err);
    }
  }, ROOM_LIST_BROADCAST_DEBOUNCE_MS);
}

// ============================================
// PERIODIC CLEANUP INTERVALS
// ============================================

/**
 * Start all background cleanup intervals.
 * Called once from the entry point after server is ready.
 */
export function startCleanupIntervals(io: Server): void {
  // 1. Cleanup rate limiter memory + old VIP cache + old room joins (every 30s)
  const { rateLimiter } = require('../src/lib/rateLimiterRedis');
  setInterval(() => {
    const now = Date.now();
    rateLimiter.cleanupMemory(RATE_LIMIT_WINDOW);

    // Cleanup old room join tracking (entries older than 10 minutes)
    const joinCutoff = now - (10 * 60 * 1000);
    lastRoomJoins.forEach((timestamp, key) => {
      if (timestamp < joinCutoff) lastRoomJoins.delete(key);
    });

    // Cleanup expired VIP cache entries
    userVipCache.forEach((cached, key) => {
      if (cached.expires < now) userVipCache.delete(key);
    });
  }, 30000);

  // 2. Cleanup stale rooms from memory (every 10 minutes)
  setInterval(() => {
    const now = Date.now();
    const STALE_ROOM_THRESHOLD = 60 * 60 * 1000; // 1 hour
    const roomsToDelete: string[] = [];

    rooms.forEach((room, roomId) => {
      if (scheduledDeletions.has(roomId)) return;
      if (room.users.length === 0 && room.lastUpdated < now - STALE_ROOM_THRESHOLD) {
        roomsToDelete.push(roomId);
      }
    });

    roomsToDelete.forEach(roomId => {
      rooms.delete(roomId);
      scheduledDeletions.delete(roomId);
      logger.debug(`[CLEANUP] Removed stale room ${roomId} from memory`);
    });

    if (roomsToDelete.length > 0) {
      logger.info(`[CLEANUP] Removed ${roomsToDelete.length} stale rooms from memory`);
    }

    // Cleanup stale userSockets entries
    let cleanedSockets = 0;
    userSockets.forEach((socketId, odId) => {
      const socketExists = io.sockets.sockets.has(socketId);
      if (!socketExists) {
        userSockets.delete(odId);
        cleanedSockets++;
      }
    });
    if (cleanedSockets > 0) {
      logger.debug(`[CLEANUP] Removed ${cleanedSockets} stale userSockets entries`);
    }
  }, 10 * 60 * 1000);

  // 3. Cleanup empty rooms — schedule deletion (every 5 minutes)
  setInterval(() => {
    rooms.forEach((room, roomId) => {
      if (room.users.length === 0 && !scheduledDeletions.has(roomId)) {
        scheduleRoomDeletion(roomId);
      }
    });
  }, 5 * 60 * 1000);

  // 4. Watch time tracking batch updates (every 60 seconds)
  setInterval(async () => {
    const now = Date.now();
    logger.debug(`[WATCH_TIME] Checking ${userWatchTracking.size} tracked users...`);

    const entries = Array.from(userWatchTracking.entries());
    const batchMap: Record<string, number> = {};

    for (const [socketId, tracking] of entries) {
      const room = rooms.get(tracking.odaId);
      const userInRoom = room?.users.some(u => u.socketId === socketId);

      if (!userInRoom) {
        logger.debug(`[WATCH_TIME] User ${tracking.userId} no longer in room ${tracking.odaId}, removing`);
        userWatchTracking.delete(socketId);
        continue;
      }

      if (room && room.isPlaying) {
        const elapsed = Math.floor((now - tracking.lastUpdate) / 1000);
        if (elapsed >= 30) {
          logger.debug(`[WATCH_TIME] Elapsed: ${elapsed}s for user ${tracking.userId}`);
        }

        if (elapsed > 0 && tracking.userId && !tracking.userId.startsWith('guest-')) {
          batchMap[tracking.userId] = (batchMap[tracking.userId] || 0) + elapsed;
        }
        tracking.lastUpdate = now;
      }
    }

    // Commit batched watch time updates
    const updateOps = Object.entries(batchMap).map(([id, inc]) =>
      prisma.user.update({ where: { id }, data: { watchTime: { increment: inc } } })
    );

    if (updateOps.length > 0) {
      try {
        await prisma.$transaction(updateOps);
        logger.debug(`[WATCH_TIME] Batched ${updateOps.length} watchTime updates`);

        // Update daily quest progress for watch_time
        const { updateDailyQuest } = require('./lib/helpers');
        for (const [userId, seconds] of Object.entries(batchMap)) {
          updateDailyQuest(userId, 'watch_time', seconds).catch(() => {});
        }
      } catch (e) {
        logger.error('Error performing batched watchTime updates:', e);
      }
    }
  }, 60 * 1000);
}
