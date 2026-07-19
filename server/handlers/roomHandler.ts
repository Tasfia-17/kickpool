/**
 * CinePurr — Room Lifecycle Domain Handler
 *
 * Manages the entire room lifecycle: joining, leaving, video changes,
 * co-host management, control requests, kicks, deletion, and the
 * synchronized video queue (add/vote/remove/play).
 *
 * Uses the centralized state module for all room mutations and
 * type-safe Prisma queries from prismaTypes.ts (zero `as unknown as`).
 *
 * @see PDF Section 1 — "Controller-Based Directory Restructuring"
 */

import { Server, Socket } from 'socket.io';
import type { AuthenticatedSocket, VideoSource, QueueItem } from '../types';
import {
  rooms,
  userSockets,
  userWatchTracking,
  userVipCache,
  USER_VIP_CACHE_TTL,
  lastRoomJoins,
  ROOM_JOIN_COOLDOWN,
  isHostOrCoHost,
  getOrCreateRoom,
  cancelRoomDeletion,
  scheduleRoomDeletion,
  updateRoomCount,
  debouncedBroadcastRoomList,
  roomCountDirty,
  roomCountTimeouts,
} from '../state';
import { prisma, getUserVipInfo } from '../lib/prismaTypes';
import {
  escapeHtml,
  emitSystemMessage,
  checkVideoChangeRateLimitAsync,
  awardXPAndActivity,
} from '../lib/helpers';
import { verifyIdentity, getSocketIdentity } from '../middleware/auth';
import logger from '../../src/lib/logger';

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Register all room lifecycle event listeners on the given socket.
 */
export function registerRoomHandlers(io: Server, socket: Socket): void {
  // ── room:join ────────────────────────────────────────────────
  socket.on(
    'room:join',
    async (
      { roomId, user }: { roomId: string; user: any },
      ack?: (response: { ok: boolean; users?: any[]; error?: string; code?: string }) => void
    ) => {
    const { isGuest, userId: authenticatedUserId } = getSocketIdentity(socket);

    logger.info(`[JOIN] User ${user?.name} (${user?.id}) joining room ${roomId}. Socket: ${socket.id}`);

    if (!user || !user.id || !user.name) {
      logger.error(`[JOIN] Invalid user object — missing id or name:`, user);
      socket.emit('room:error', { message: 'Invalid user data', code: 'INVALID_USER' });
      ack?.({ ok: false, error: 'Invalid user data', code: 'INVALID_USER' });
      return;
    }

    // Identity verification — hard reject on auth mismatch to prevent ghost users.
    // If the socket is authenticated (not a guest) and the claimed user.id
    // doesn't match the JWT-verified userId, reject immediately.
    if (!isGuest && authenticatedUserId && user.id !== authenticatedUserId) {
      logger.warn(
        `[AUTH] room:join identity mismatch: claimed ${user.id}, authenticated as ${authenticatedUserId}`
      );
      socket.emit('room:error', { message: 'Identity mismatch — you cannot join as another user', code: 'AUTH_MISMATCH' });
      ack?.({ ok: false, error: 'Identity mismatch', code: 'AUTH_MISMATCH' });
      return;
    }

    try {
      // 1. Load room from DB
      let dbRoom: any = null;
      try {
        dbRoom = await prisma.room.findUnique({ where: { id: roomId } });
        logger.debug(`[JOIN] prisma.room.findUnique(${roomId}) => ${dbRoom ? 'found' : 'not found'}`);
      } catch (dbError: unknown) {
        logger.error(`[JOIN] Database error looking up room ${roomId}:`, (dbError as Error).message);
        logger.warn(`[JOIN] Database unavailable, allowing join with in-memory state only`);
      }

      // Create temporary room if not in DB or memory
      if (!dbRoom && !rooms.has(roomId)) {
        logger.warn(`[JOIN] Room ${roomId} not in DB or memory, creating temporary in-memory room`);
        getOrCreateRoom(roomId, { hostId: user.id });
      }

      // 2. Enforce max users limit
      if (dbRoom) {
        const currentCount = rooms.get(roomId)?.users.length ?? 0;
        if (currentCount >= dbRoom.maxUsers) {
          logger.warn(`[JOIN] Room ${roomId} is full (${currentCount}/${dbRoom.maxUsers}). Rejecting ${user.name}`);
          socket.emit('room:error', { message: `Room is full (max ${dbRoom.maxUsers} users)`, code: 'ROOM_FULL' });
          ack?.({ ok: false, error: 'Room is full', code: 'ROOM_FULL' });
          return;
        }
      }

      // 3. Join the Socket.io room
      socket.join(roomId);
      cancelRoomDeletion(roomId);

      // 4. Sync in-memory state (create if needed)
      if (!rooms.has(roomId)) {
        getOrCreateRoom(roomId, {
          currentVideo: dbRoom
            ? {
                url: dbRoom.currentVideoUrl,
                title: dbRoom.currentVideoTitle,
                provider: dbRoom.currentVideoProvider as VideoSource['provider'],
              }
            : { url: '', title: '', provider: 'youtube' },
          hostId: dbRoom?.hostId || user.id,
        });
        logger.info(`[JOIN] Created in-memory room state for ${roomId}`);
      }

      // 5. Add user to room list
      const roomState = rooms.get(roomId)!;

      // Get VIP info from cache (non-blocking)
      let userVipInfo: any = undefined;
      const cachedVip = userVipCache.get(user.id);
      if (cachedVip && cachedVip.expires > Date.now()) {
        userVipInfo = cachedVip.data;
      }

      // Fetch VIP info in background (non-blocking)
      if (!cachedVip || cachedVip.expires <= Date.now()) {
        getUserVipInfo(user.id)
          .then(vipData => {
            if (vipData) {
              userVipCache.set(user.id, { expires: Date.now() + USER_VIP_CACHE_TTL, data: vipData });
              // Update user in room if VIP info loaded
              const currentRoomState = rooms.get(roomId);
              if (currentRoomState) {
                const userInRoom = currentRoomState.users.find(
                  u => u.id === user.id && u.socketId === socket.id
                );
                if (userInRoom) {
                  userInRoom.isVIP = vipData.isVIP || false;
                  userInRoom.isFounder = vipData.isFounder || false;
                  userInRoom.vipNameColor = vipData.vipNameColor || undefined;
                  userInRoom.vipBadge = vipData.vipBadge || undefined;
                  userInRoom.vipGlow = vipData.vipGlow || false;
                  io.to(roomId).emit('room:users_update', currentRoomState.users);
                }
              }
            }
          })
          .catch((err: unknown) => {
            logger.debug(`[JOIN] Could not fetch VIP info for user ${user.id}:`, (err as Error).message);
          });
      }

      // Remove existing entry for this user to prevent duplicates
      roomState.users = roomState.users.filter(u => u.id !== user.id && u.socketId !== socket.id);
      roomState.users.push({
        ...user,
        socketId: socket.id,
        isVIP: userVipInfo?.isVIP || false,
        isVIPAdmin: false,
        isFounder: userVipInfo?.isFounder || false,
        vipNameColor: userVipInfo?.vipNameColor || undefined,
        vipBadge: userVipInfo?.vipBadge || undefined,
        vipGlow: userVipInfo?.vipGlow || false,
        watchTime: userVipInfo?.watchTime ?? 0,
        petFamily: user.petFamily,
        petName: user.petName,
      });
      logger.info(`[JOIN] Added user ${user.name} (${user.id}) to room ${roomId}. Total users: ${roomState.users.length}`);

      // 6. Send current video state to the joining user
      const currentTimestamp = roomState.isPlaying
        ? roomState.timestamp + (Date.now() - roomState.lastUpdated) / 1000
        : roomState.timestamp;

      socket.emit('player:sync', {
        ...roomState,
        timestamp: currentTimestamp,
        lastUpdated: Date.now(),
      });
      if (roomState.currentVideo) {
        socket.emit('room:video_changed', roomState.currentVideo);
      }
      socket.emit('room:queue_update', roomState.queue);

      // 7. Broadcast user list IMMEDIATELY (before any DB operations)
      // The joining user gets data via the ack callback (primary) + the io.to broadcast.
      // No separate socket.emit needed — that was a source of duplicate/out-of-order events.
      logger.info(`[JOIN] Broadcasting user list to room ${roomId}: ${roomState.users.length} users`);
      io.to(roomId).emit('room:users_update', roomState.users);
      ack?.({ ok: true, users: roomState.users });
      updateRoomCount(roomId, roomState.users.length);
      debouncedBroadcastRoomList(io);

      // 8. System message
      emitSystemMessage(io, roomId, `${user.name} joined the room`);

      // 9. Send chat history (non-blocking)
      prisma.message
        .findMany({
          where: { roomId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        })
        .then(messages => {
          socket.emit(
            'chat:history',
            messages.map(m => ({
              id: m.id,
              user: m.username,
              text: m.text,
              timestamp: m.createdAt.getTime(),
            }))
          );
        })
        .catch(err => {
          logger.warn(`[JOIN] Error fetching chat history for room ${roomId}:`, err);
          socket.emit('chat:history', []);
        });

      // 10. XP / Activity / Stats (async, non-blocking)
      if (user.id && !user.id.startsWith('guest-')) {
        userWatchTracking.set(socket.id, {
          odaId: roomId,
          userId: user.id,
          lastUpdate: Date.now(),
        });

        const isNotificationRoom = roomId.startsWith('notifications-');

        prisma.room
          .findUnique({ where: { id: roomId }, select: { name: true } })
          .then(room => {
            const roomName = room?.name || roomId;
            const updatePromises: Promise<any>[] = [];

            if (!isNotificationRoom) {
              updatePromises.push(awardXPAndActivity(user.id, 10, 'room_join', { roomId, roomName }));

              // roomsJoined count with cooldown
              updatePromises.push(
                (async () => {
                  const joinKey = `${user.id}-${roomId}`;
                  const lastJoinTime = lastRoomJoins.get(joinKey) || 0;
                  const now = Date.now();
                  if (now - lastJoinTime > ROOM_JOIN_COOLDOWN) {
                    await prisma.user.update({
                      where: { id: user.id },
                      data: { roomsJoined: { increment: 1 } },
                    });
                    lastRoomJoins.set(joinKey, now);
                  }
                })()
              );
            }

            Promise.all(updatePromises).catch(err => {
              logger.debug(`[JOIN] Error updating user stats for ${user.id}:`, err);
            });
          })
          .catch(() => {
            if (!roomId.startsWith('notifications-')) {
              awardXPAndActivity(user.id, 10, 'room_join', { roomId, roomName: roomId }).catch(() => {});
            }
          });
      }
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('room:error', { message: 'Failed to join room', code: 'JOIN_ERROR' });
      ack?.({ ok: false, error: 'Failed to join room', code: 'JOIN_ERROR' });
    }
  });

  // ── room:change_video — Host changes the current video ───────
  socket.on('room:change_video', async ({ roomId, video }: { roomId: string; video: any }) => {
    // Rate limit video changes
    const allowed = await checkVideoChangeRateLimitAsync(socket.id);
    if (!allowed) {
      socket.emit('room:error', { message: 'Too many video changes. Please wait a moment.', code: 'RATE_LIMITED' });
      return;
    }

    if (!video?.url || typeof video.url !== 'string') {
      socket.emit('room:error', { message: 'Invalid video URL', code: 'INVALID_VIDEO' });
      return;
    }

    const sanitizedTitle = video.title ? escapeHtml(String(video.title).slice(0, 200)) : 'Untitled Video';
    const sanitizedVideo = { ...video, title: sanitizedTitle, url: video.url.trim() };

    const room = rooms.get(roomId);
    if (!room) return;

    // Verify sender is host or co-host
    const senderUser = room.users.find(u => u.socketId === socket.id);
    if (!senderUser || !isHostOrCoHost(room, senderUser.id)) {
      logger.debug(`[CHANGE_VIDEO] Blocked non-host video change from ${socket.id}`);
      socket.emit('room:error', { message: 'Only the host or co-host can change the video', code: 'UNAUTHORIZED' });
      return;
    }

    const newState = {
      ...room,
      currentVideo: sanitizedVideo,
      isPlaying: false,
      timestamp: 0,
      lastUpdated: Date.now(),
    };
    rooms.set(roomId, newState);

    // Persist to DB
    try {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          currentVideoUrl: video.url,
          currentVideoTitle: video.title,
          currentVideoProvider: video.provider,
        },
      });
    } catch (error) {
      logger.error('Error updating video in DB:', error);
    }

    // Save watch history for authenticated user
    const { userId: authUserId, isGuest } = getSocketIdentity(socket);
    if (!isGuest && video.url) {
      prisma.watchHistory
        .create({
          data: {
            userId: authUserId,
            roomId,
            videoUrl: video.url,
            videoTitle: sanitizedTitle,
          },
        })
        .catch(e => logger.error('Error saving watch history:', e));
    }

    // Broadcast
    io.to(roomId).emit('room:video_changed', video);
    io.to(roomId).emit('player:sync', newState);
    logger.info(`[CHANGE_VIDEO] room ${roomId} video changed to ${video.title}`);
    emitSystemMessage(io, roomId, `Video changed to: ${video.title}`);
  });

  // ── room:kick — Host/co-host kicks a user ────────────────────
  socket.on('room:kick', ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const requester = room.users.find(u => u.socketId === socket.id);
    if (!requester || !isHostOrCoHost(room, requester.id)) return;

    const targetUser = room.users.find(u => u.id === targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('room:kicked');
      room.users = room.users.filter(u => u.id !== targetUserId);
      io.to(roomId).emit('room:users_update', room.users);
      updateRoomCount(roomId, room.users.length);
      debouncedBroadcastRoomList(io);
      emitSystemMessage(io, roomId, `${targetUser.name} was kicked from the room`);
    }
  });

  // ── room:delete — Host deletes their room ────────────────────
  socket.on('room:delete', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
      return;
    }

    // Determine the requester: prefer JWT identity, fall back to room user list
    const { userId: authUserId, isGuest } = getSocketIdentity(socket);
    const requester = room.users.find(u => u.socketId === socket.id);
    const effectiveUserId = (!isGuest && authUserId) ? authUserId : requester?.id;

    if (!effectiveUserId) {
      socket.emit('room:error', { message: 'Authentication required to delete a room', code: 'UNAUTHENTICATED' });
      return;
    }

    if (room.hostId && effectiveUserId !== room.hostId) {
      socket.emit('room:error', { message: 'Only the host can delete this room', code: 'UNAUTHORIZED' });
      return;
    }

    io.to(roomId).emit('room:deleted', { message: 'The host has deleted this room', roomId });
    rooms.delete(roomId);
    io.in(roomId).socketsLeave(roomId);
    cancelRoomDeletion(roomId);

    // Clean up stale room count state to prevent phantom DB writes
    // corrupting subsequent room creations with the same ID
    roomCountDirty.delete(roomId);
    if (roomCountTimeouts.has(roomId)) {
      clearTimeout(roomCountTimeouts.get(roomId)!);
      roomCountTimeouts.delete(roomId);
    }

    logger.info(`[ROOM_DELETE] Room ${roomId} deleted by host ${effectiveUserId}`);
  });

  const setCoHost = ({
    roomId,
    targetUserId,
    action,
  }: {
    roomId: string;
    targetUserId: string;
    action: 'promote' | 'demote';
  }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const requester = room.users.find(u => u.socketId === socket.id);
    if (!requester || requester.id !== room.hostId) {
      socket.emit('room:error', { message: 'Only the host can manage co-hosts', code: 'UNAUTHORIZED' });
      return;
    }

    if (action === 'promote') {
      if (!room.coHostIds.includes(targetUserId)) {
        room.coHostIds.push(targetUserId);
      }
    } else {
      room.coHostIds = room.coHostIds.filter(id => id !== targetUserId);
    }

    io.to(roomId).emit('room:cohost_updated', { coHostIds: room.coHostIds });
    const targetUser = room.users.find(u => u.id === targetUserId);
    emitSystemMessage(
      io,
      roomId,
      action === 'promote'
        ? `${targetUser?.name || targetUserId} is now a co-host`
        : `${targetUser?.name || targetUserId} is no longer a co-host`
    );
  };

  // ── room:set-cohost — Host promotes/demotes co-hosts ─────────
  socket.on(
    'room:set-cohost',
    ({ roomId, targetUserId, action }: { roomId: string; targetUserId: string; action: 'promote' | 'demote' }) => {
      setCoHost({ roomId, targetUserId, action });
    }
  );

  socket.on('room:promote_cohost', ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
    setCoHost({ roomId, targetUserId, action: 'promote' });
  });

  socket.on('room:demote_cohost', ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
    setCoHost({ roomId, targetUserId, action: 'demote' });
  });

  // ── room:request-control — Viewer requests host control ──────
  socket.on('room:request-control', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const requester = room.users.find(u => u.socketId === socket.id);
    if (!requester || isHostOrCoHost(room, requester.id)) return;

    const hostUser = room.users.find(u => u.id === room.hostId);
    if (hostUser) {
      io.to(hostUser.socketId).emit('room:control_requested', {
        userId: requester.id,
        username: requester.name,
      });
      logger.info(`[CONTROL] ${requester.name} requested control in room ${roomId}`);
    }
  });

  // ── room:grant-control — Host grants control to a viewer ─────
  socket.on(
    'room:grant-control',
    ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const sender = room.users.find(u => u.socketId === socket.id);
      if (!sender || room.hostId !== sender.id) {
        logger.debug(`[CONTROL] Non-host tried to grant control in room ${roomId}`);
        return;
      }

      if (!room.coHostIds.includes(targetUserId)) {
        room.coHostIds.push(targetUserId);
      }

      io.to(roomId).emit('room:cohost_updated', { coHostIds: room.coHostIds });

      const targetUser = room.users.find(u => u.id === targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('room:control_granted');
        emitSystemMessage(io, roomId, `🎮 ${targetUser.name} has been granted co-host control`);
      }

      logger.info(`[CONTROL] Host granted control to ${targetUserId} in room ${roomId}`);
    }
  );

  // ── room:start_countdown ─────────────────────────────────────
  socket.on('room:start_countdown', ({ roomId, starterName }: { roomId: string; starterName: string }) => {
    logger.debug(`[COUNTDOWN] ${starterName} started countdown in room ${roomId}`);
    io.to(roomId).emit('room:countdown', { starterName });
  });

  // ════════════════════════════════════════════════════════════
  // VIDEO QUEUE SUBSYSTEM (Add / Vote / Remove / Play Next)
  // ════════════════════════════════════════════════════════════

  // ── room:queue_add ───────────────────────────────────────────
  socket.on('room:queue_add', ({ roomId, video }: { roomId: string; video: any }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const roomUser = room.users.find(u => u.socketId === socket.id);
    const username = roomUser?.name || getSocketIdentity(socket).userName;

    // Prevent duplicate URLs
    if (room.queue.some(q => q.url === video.url)) {
      socket.emit('chat:error', { message: 'This video is already in the queue' });
      return;
    }

    // Extract YouTube thumbnail or use client-provided one
    let thumbnail: string | undefined = video.thumbnail;
    if (!thumbnail && video.url) {
      const ytMatch = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
      if (ytMatch) {
        thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
      }
    }

    const queueItem: QueueItem = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      url: video.url,
      title: video.title,
      provider: video.provider || 'youtube',
      addedBy: username,
      votes: 1,
      voters: [username],
      thumbnail,
    };

    room.queue.push(queueItem);
    room.queue.sort((a, b) => b.votes - a.votes);
    io.to(roomId).emit('room:queue_update', room.queue);
    emitSystemMessage(io, roomId, `🎬 ${username} added to queue: ${video.title}`);
  });

  // ── room:queue_vote ──────────────────────────────────────────
  socket.on('room:queue_vote', ({ roomId, queueItemId }: { roomId: string; queueItemId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const roomUser = room.users.find(u => u.socketId === socket.id);
    const username = roomUser?.name || getSocketIdentity(socket).userName;

    const item = room.queue.find(q => q.id === queueItemId);
    if (!item) return;

    // Toggle vote
    const voterIndex = item.voters.indexOf(username);
    if (voterIndex >= 0) {
      item.voters.splice(voterIndex, 1);
    } else {
      item.voters.push(username);
    }
    item.votes = item.voters.length;

    room.queue.sort((a, b) => b.votes - a.votes);
    io.to(roomId).emit('room:queue_update', room.queue);
  });

  // ── room:queue_remove ────────────────────────────────────────
  socket.on('room:queue_remove', ({ roomId, queueItemId }: { roomId: string; queueItemId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const roomUser = room.users.find(u => u.socketId === socket.id);
    const username = roomUser?.name || getSocketIdentity(socket).userName;
    const userIsHost = isHostOrCoHost(room, roomUser?.id || getSocketIdentity(socket).userId);

    const idx = room.queue.findIndex(q => q.id === queueItemId);
    if (idx < 0) return;

    if (!userIsHost && room.queue[idx].addedBy !== username) {
      socket.emit('chat:error', { message: 'Only the host or the person who added it can remove queue items' });
      return;
    }

    const removed = room.queue.splice(idx, 1)[0];
    io.to(roomId).emit('room:queue_update', room.queue);
    emitSystemMessage(io, roomId, `Removed from queue: ${removed.title}`);
  });

  // ── room:queue_play_next ─────────────────────────────────────
  socket.on('room:queue_play_next', ({ roomId, queueItemId }: { roomId: string; queueItemId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const roomUser = room.users.find(u => u.socketId === socket.id);
    const userIsHost = isHostOrCoHost(room, roomUser?.id || getSocketIdentity(socket).userId);

    if (!userIsHost) {
      socket.emit('chat:error', { message: 'Only the host can play queue items' });
      return;
    }

    const idx = room.queue.findIndex(q => q.id === queueItemId);
    if (idx < 0) return;

    const item = room.queue.splice(idx, 1)[0];
    const video: VideoSource = {
      url: item.url,
      title: item.title,
      provider: item.provider as VideoSource['provider'],
    };

    room.currentVideo = video;
    room.isPlaying = false;
    room.timestamp = 0;
    room.lastUpdated = Date.now();

    io.to(roomId).emit('room:video_changed', video);
    io.to(roomId).emit('player:sync', {
      isPlaying: false,
      timestamp: 0,
      lastUpdated: room.lastUpdated,
      currentVideo: video,
      hostId: room.hostId,
    });
    io.to(roomId).emit('room:queue_update', room.queue);
    emitSystemMessage(io, roomId, `▶ Now playing from queue: ${item.title}`);

    // Persist to DB
    prisma.room
      .update({
        where: { id: roomId },
        data: { currentVideoUrl: video.url, currentVideoTitle: video.title, currentVideoProvider: video.provider },
      })
      .catch(e => logger.error('Error persisting queue play video:', e));
  });

  // ── room:get_users ───────────────────────────────────────────
  // Allows clients to explicitly request the user list to resolve
  // race conditions where the initial room:join broadcast fires
  // before React has finished attaching socket listeners.
  socket.on('room:get_users', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    socket.emit('room:users_update', room.users);
  });

  // ── room:request_full_state ─────────────────────────────────
  // Atomic state recovery: returns users + video + queue in one
  // ack response. Replaces the 3 separate fallback requests that
  // fired with arbitrary delays and competed with each other.
  socket.on(
    'room:request_full_state',
    (
      { roomId }: { roomId: string },
      ack?: (response: any) => void
    ) => {
      const room = rooms.get(roomId);
      if (!room) {
        ack?.({ ok: false, error: 'Room not found' });
        return;
      }

      const currentTimestamp = room.isPlaying
        ? room.timestamp + (Date.now() - room.lastUpdated) / 1000
        : room.timestamp;

      ack?.({
        ok: true,
        users: room.users,
        currentVideo: room.currentVideo,
        isPlaying: room.isPlaying,
        timestamp: currentTimestamp,
        lastUpdated: Date.now(),
        hostId: room.hostId,
        coHostIds: room.coHostIds,
        queue: room.queue,
      });
    }
  );

}
