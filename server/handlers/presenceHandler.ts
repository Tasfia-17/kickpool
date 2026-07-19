/**
 * CinePurr — Presence & Social Domain Handler
 *
 * Manages user online presence, direct messaging, and the critical
 * disconnect cleanup logic (room removal, host promotion, game cleanup).
 *
 * This handler owns:
 *   • user:connect / user:disconnect — socket ↔ userId mapping
 *   • dm:send — private messaging with notification triggers
 *   • socket 'disconnect' — cleanup across rooms and games
 */

import { Server, Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import {
  rooms,
  userSockets,
  gameRooms,
  userWatchTracking,
  isHostOrCoHost,
  updateRoomCount,
  scheduleRoomDeletion,
  debouncedBroadcastRoomList,
} from '../state';
import { prisma } from '../lib/prismaTypes';
import { filterMessage, emitSystemMessage } from '../lib/helpers';
import { getSocketIdentity, verifyIdentity } from '../middleware/auth';
import logger from '../../src/lib/logger';

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Register presence, social, and disconnect handlers on the given socket.
 */
export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const { userId: authenticatedUserId, isGuest } = getSocketIdentity(socket);

  // ── user:connect — Register userId ↔ socketId mapping ────────
  socket.on('user:connect', ({ id }: { id: string }) => {
    if (!id) return;

    // Verify identity (prevent spoofing)
    if (!verifyIdentity(socket, id)) {
      socket.emit('room:error', { message: 'Identity mismatch', code: 'AUTH_MISMATCH' });
      return;
    }

    userSockets.set(id, socket.id);
    logger.debug(`[USER] Registered user ${id} -> socket ${socket.id}`);
  });

  // ── user:disconnect — Explicit disconnection (not socket drop) ─
  socket.on('user:disconnect', ({ id }: { id: string }) => {
    if (userSockets.get(id) === socket.id) {
      userSockets.delete(id);
    }
  });

  // ── dm:send — Private messaging with notification ────────────
  socket.on('dm:send', async ({ receiverId, text }: { receiverId: string; text: string }) => {
    try {
      if (!receiverId || !text) return;

      const { userId: senderId } = getSocketIdentity(socket);

      // Persist the DM with filtered text
      const dm = await prisma.directMessage.create({
        data: {
          text: filterMessage(text),
          senderId,
          receiverId,
        },
      });

      // Create notification for the receiver
      try {
        const senderUser = await prisma.user.findUnique({
          where: { id: senderId },
          select: { username: true },
        });

        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'message',
            title: 'New message',
            message: `${senderUser?.username || 'Someone'} sent you a message`,
            data: JSON.stringify({ directMessageId: dm.id }),
          },
        });
      } catch (e) {
        logger.error('Failed to create DM notification', e);
      }

      // Real-time delivery if receiver is connected
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('dm:received', {
          id: dm.id,
          text: dm.text,
          senderId: dm.senderId,
          receiverId: dm.receiverId,
          createdAt: dm.createdAt.getTime(),
        });

        // Also emit notification event for live notification badge
        try {
          const senderUser = await prisma.user.findUnique({
            where: { id: senderId },
            select: { username: true },
          });
          io.to(receiverSocketId).emit('notification:new', {
            id: `temp-${Date.now()}`,
            type: 'message',
            title: 'New message',
            message: `${senderUser?.username || 'Someone'} sent you a message`,
            read: false,
            createdAt: new Date().toISOString(),
            data: JSON.stringify({ directMessageId: dm.id }),
          });
        } catch (e) {
          logger.error('Failed to emit notification event', e);
        }
      }

      // Acknowledge to sender
      socket.emit('dm:sent', {
        id: dm.id,
        text: dm.text,
        senderId: dm.senderId,
        receiverId: dm.receiverId,
        createdAt: dm.createdAt.getTime(),
      });
    } catch (err) {
      logger.error('DM socket error', err);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // DISCONNECT — The most critical cleanup handler
  // ══════════════════════════════════════════════════════════════
  //
  // When a socket drops, we must:
  //   1. Stop watch time tracking
  //   2. Clean up userSockets mapping
  //   3. Remove user from ALL rooms they're in
  //   4. Promote a new host if the host left
  //   5. Schedule empty rooms for deletion
  //   6. Remove player from game rooms
  //
  socket.on('disconnect', () => {
    // 1. Stop watch time tracking
    userWatchTracking.delete(socket.id);

    // 2. Clean up userSockets mapping
    userSockets.forEach((socketId, odId) => {
      if (socketId === socket.id) {
        userSockets.delete(odId);
      }
    });

    // 3. Remove user from all rooms
    rooms.forEach((room, roomId) => {
      const userIndex = room.users.findIndex(u => u.socketId === socket.id);
      if (userIndex === -1) return;

      const user = room.users[userIndex];
      room.users.splice(userIndex, 1);

      // Broadcast updated user list
      io.to(roomId).emit('room:users_update', room.users);
      updateRoomCount(roomId, room.users.length);
      debouncedBroadcastRoomList(io);
      emitSystemMessage(io, roomId, `${user.name} left the room`);

      // 4. Host promotion if host left
      if (room.hostId === user.id && room.users.length > 0) {
        // Try to find a co-host still in the room
        let newHostId = room.coHostIds.find(id => room.users.some(u => u.id === id));

        // Fallback to first user in the list
        if (!newHostId && room.users.length > 0) {
          newHostId = room.users[0].id;
        }

        if (newHostId) {
          const newHost = room.users.find(u => u.id === newHostId);
          room.hostId = newHostId;

          io.to(roomId).emit('room:host_changed', {
            hostId: newHostId,
            hostName: newHost?.name || 'New Host',
          });

          emitSystemMessage(io, roomId, `👑 ${newHost?.name || 'A user'} has been promoted to host`);
          logger.info(`[HOST_PROMOTION] Room ${roomId}: ${newHostId} promoted after host left`);

          // Persist new host to DB
          prisma.room
            .update({ where: { id: roomId }, data: { hostId: newHostId } })
            .catch(e => logger.error('Error updating host in DB on disconnect:', e));
        }
      }

      // 5. Schedule empty room for deletion
      if (room.users.length === 0) {
        scheduleRoomDeletion(roomId);
      }
    });

    // 6. Remove from game rooms
    gameRooms.forEach((game, gameId) => {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const player = game.players[playerIndex];
        game.players.splice(playerIndex, 1);
        io.to(gameId).emit('game:player_left', { players: game.players, user: player });

        if (game.players.length === 0) {
          gameRooms.delete(gameId);
        }
      }
    });

    logger.info('Client disconnected:', socket.id);
  });
}
