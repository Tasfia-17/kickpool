/**
 * CinePurr — Chat Domain Handler
 *
 * Manages the full chat lifecycle: message sending with Write-Behind
 * caching, history retrieval, typing indicators, and message reactions.
 *
 * @see PDF Section 4 — "Write-Behind Caching and Batching"
 *
 * Architecture:
 *   1. Validate + sanitize the message (XSS + bad words)
 *   2. Optimistic broadcast with a temporary ID
 *   3. Enqueue to BullMQ for async DB persistence
 *   4. Fallback: direct Prisma write if Redis/BullMQ unavailable
 */

import { Server, Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { rooms, userVipCache, USER_VIP_CACHE_TTL } from '../state';
import { prisma, getUserVipInfo } from '../lib/prismaTypes';
import {
  escapeHtml,
  filterMessage,
  emitSystemMessage,
  checkRateLimitAsync,
  awardXPAndActivity,
  updateDailyQuest,
} from '../lib/helpers';
import { getSocketIdentity } from '../middleware/auth';
import logger from '../../src/lib/logger';

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Register all chat-related event listeners on the given socket.
 * Called once per connection from the entry-point's io.on('connection').
 */
export function registerChatHandlers(io: Server, socket: Socket): void {
  // ── chat:message — Write-Behind Caching flow ─────────────────
  socket.on('chat:message', async ({ roomId, message }: { roomId: string; message: string }) => {
    const { userId, userName } = getSocketIdentity(socket);

    // 1. Rate limiting (Redis-backed with memory fallback)
    const allowed = await checkRateLimitAsync(socket.id);
    if (!allowed) {
      socket.emit('chat:error', { message: 'Slow down! You are sending messages too fast.' });
      return;
    }

    // 2. Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return;
    }

    // 3. Truncate + sanitize
    const truncatedMessage = message.slice(0, 1000);
    const escapedMessage = escapeHtml(truncatedMessage);
    const filteredMessage = filterMessage(escapedMessage);

    try {
      // 4. Resolve VIP info (cache-first, async DB fallback)
      const userInfo = await resolveVipInfo(userId, roomId);

      // 5. OPTIMISTIC BROADCAST — emit immediately with a temporary ID
      //    Clients render this instantly; the real DB id arrives via chat:message_saved
      const tempId = 'temp-' + Math.random().toString(36).substring(2, 9);
      const tempTimestamp = Date.now();

      io.to(roomId).emit('chat:broadcast', {
        id: tempId,
        user: userName,
        text: filteredMessage,
        timestamp: tempTimestamp,
        isVIP: userInfo?.isVIP || false,
        isVIPAdmin: false,
        isFounder: userInfo?.isFounder || false,
        vipNameColor: userInfo?.vipNameColor,
        vipFont: userInfo?.vipFont,
        vipBadge: userInfo?.vipBadge,
        vipGlow: userInfo?.vipGlow,
        watchTime: userInfo?.watchTime ?? 0,
      });

      // 6. WRITE-BEHIND — enqueue to BullMQ for async DB persistence
      //    If Redis/BullMQ is unavailable, fall back to a direct Prisma write.
      try {
        const { messageQueue } = await import('../../src/lib/messageQueue');
        await messageQueue.add('save', {
          roomId,
          userId,
          text: filteredMessage,
          username: userName,
          tempId,
        });
        // Worker will emit 'chat:message_saved' after DB write
      } catch (_queueError) {
        // Fallback: direct DB write if Redis/queue unavailable
        try {
          const savedMessage = await prisma.message.create({
            data: { roomId, userId, text: filteredMessage, username: userName },
          });
          io.to(roomId).emit('chat:message_saved', { tempId, realId: savedMessage.id });
        } catch (dbError) {
          logger.error('Error saving message to DB (fallback):', dbError);
        }
      }

      // 7. Update user stats asynchronously (non-blocking)
      if (!userId.startsWith('guest-')) {
        prisma.user
          .update({
            where: { id: userId },
            data: { messagesSent: { increment: 1 } },
          })
          .catch((e: unknown) => logger.debug('Error incrementing messagesSent:', (e as Error).message));

        updateDailyQuest(userId, 'send_messages', 1).catch(() => {});
      }
    } catch (error) {
      logger.error('Error handling chat message:', error);
    }
  });

  // ── chat:request_history ─────────────────────────────────────
  socket.on('chat:request_history', async ({ roomId }: { roomId: string }) => {
    logger.info(`[CHAT] Received chat:request_history for room ${roomId} from socket ${socket.id}`);
    try {
      const messages = await prisma.message.findMany({
        where: { roomId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      socket.emit(
        'chat:history',
        messages.map(m => ({
          id: m.id,
          user: m.username,
          text: m.text,
          timestamp: m.createdAt.getTime(),
        }))
      );
      logger.info(`[CHAT] Sent ${messages.length} messages for room ${roomId}`);
    } catch (err) {
      logger.warn(`[CHAT] Error fetching chat history for room ${roomId}:`, err);
      socket.emit('chat:history', []);
    }
  });

  // ── chat:typing_start / stop ─────────────────────────────────
  socket.on('chat:typing_start', ({ roomId, user }: { roomId: string; user: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.typingUsers.add(user);
      socket.to(roomId).emit('chat:typing_update', Array.from(room.typingUsers));
    }
  });

  socket.on('chat:typing_stop', ({ roomId, user }: { roomId: string; user: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.typingUsers.delete(user);
      socket.to(roomId).emit('chat:typing_update', Array.from(room.typingUsers));
    }
  });

  // ── chat:react — toggle emoji reaction on a message ──────────
  socket.on(
    'chat:react',
    async ({ roomId, messageId, emoji, user }: { roomId: string; messageId: string; emoji: string; user: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return;

        const reactions: Record<string, string[]> = message.reactions ? JSON.parse(message.reactions) : {};

        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }

        // Toggle reaction
        const userIndex = reactions[emoji].indexOf(user);
        if (userIndex > -1) {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(user);
        }

        await prisma.message.update({
          where: { id: messageId },
          data: { reactions: JSON.stringify(reactions) },
        });

        io.to(roomId).emit('chat:reaction', { messageId, emoji, user });
      } catch (error) {
        logger.error('Error handling reaction:', error);
      }
    }
  );
}

// ============================================
// INTERNAL: VIP Info Resolution (Cache-First)
// ============================================

/**
 * Resolve a user's VIP info using a layered strategy:
 *   1. In-memory cache (5-min TTL)
 *   2. Database query → write to cache
 *   3. Room state fallback if DB is unavailable
 */
async function resolveVipInfo(userId: string, roomId: string) {
  // 1. Cache hit
  const cached = userVipCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // 2. DB fetch (skip for guests)
  if (!userId.startsWith('guest-')) {
    try {
      const vipData = await getUserVipInfo(userId);
      if (vipData) {
        const info = {
          isVIP: vipData.isVIP || false,
          isFounder: vipData.isFounder || false,
          vipNameColor: vipData.vipNameColor,
          vipFont: vipData.vipFont,
          vipBadge: vipData.vipBadge,
          vipGlow: vipData.vipGlow,
          role: vipData.role,
          watchTime: vipData.watchTime ?? 0,
        };

        // Update cache
        userVipCache.set(userId, { expires: Date.now() + USER_VIP_CACHE_TTL, data: info });

        // Also update room state if user is in room
        const roomState = rooms.get(roomId);
        if (roomState) {
          const userInRoom = roomState.users.find(u => u.id === userId);
          if (userInRoom) {
            Object.assign(userInRoom, info);
          }
        }

        return info;
      }
    } catch (dbError) {
      logger.warn('Error fetching VIP info from DB, using room state fallback:', dbError);
    }
  }

  // 3. Room state fallback
  const roomState = rooms.get(roomId);
  if (roomState) {
    const found = roomState.users.find(u => u.id === userId);
    if (found) {
      return {
        isVIP: found.isVIP || false,
        isFounder: found.isFounder || false,
        vipNameColor: found.vipNameColor,
        vipFont: undefined,
        vipBadge: found.vipBadge,
        vipGlow: found.vipGlow,
        watchTime: found.watchTime ?? 0,
      };
    }
  }

  return null;
}
