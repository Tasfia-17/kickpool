/**
 * CinePurr — Game Domain Handler
 *
 * Manages the multiplayer mini-game subsystem: lobby creation, joining,
 * invites, move broadcasting, state synchronization, and cleanup.
 *
 * Uses the centralized `gameRooms` Map from state.ts.
 */

import { Server, Socket } from 'socket.io';
import { gameRooms, userSockets } from '../state';
import { getSocketIdentity, verifyIdentity } from '../middleware/auth';
import { checkRateLimitAsync } from '../lib/helpers';
import logger from '../../src/lib/logger';

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Register all game-related event listeners on the given socket.
 */
export function registerGameHandlers(io: Server, socket: Socket): void {
  // ── game:create — Host creates a new mini-game lobby ─────────
  socket.on('game:create', async ({ gameType, user }: { gameType: string; user: { id: string; name: string } }) => {
    if (!(await checkRateLimitAsync(socket.id))) {
      socket.emit('game:error', { message: 'Too many requests' });
      return;
    }
    if (!user || !user.id || !user.name) {
      socket.emit('game:error', { message: 'Invalid user data' });
      logger.warn(`[GAME] Invalid user data for game create`, user);
      return;
    }

    // Generate a unique 5-digit game code (10000–99999)
    let gameId: string;
    let attempts = 0;
    do {
      gameId = Math.floor(10000 + Math.random() * 90000).toString();
      attempts++;
      if (attempts > 100) {
        gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        break;
      }
    } while (gameRooms.has(gameId));

    const initialPlayer = { id: user.id, name: user.name, socketId: socket.id };
    gameRooms.set(gameId, {
      gameType,
      players: [initialPlayer],
      gameState: {},
      hostId: user.id,
    });

    socket.join(gameId);
    socket.emit('game:created', {
      gameId,
      players: [{ id: initialPlayer.id, name: initialPlayer.name }],
    });
    logger.info(`[GAME] Game room created: ${gameId} by ${user.name} (${user.id}). Players: 1/2`);

    // Broadcast lobby availability
    io.emit('game:lobby_updated', {
      gameId,
      gameType,
      players: 1,
      maxPlayers: 2,
      hostName: user.name,
      action: 'created',
    });
  });

  // ── game:join — Player joins an existing game ────────────────
  socket.on('game:join', async ({ gameId, user }: { gameId: string; user: { id: string; name: string } }) => {
    if (!(await checkRateLimitAsync(socket.id))) {
      socket.emit('game:error', { message: 'Too many requests' });
      return;
    }
    if (!user || !user.id || !user.name) {
      socket.emit('game:error', { message: 'Invalid user data' });
      logger.warn(`[GAME] Invalid user data for game join: ${gameId}`, user);
      return;
    }

    const game = gameRooms.get(gameId);
    if (!game) {
      socket.emit('game:error', { message: 'Game not found' });
      logger.warn(`[GAME] Game not found: ${gameId}`);
      return;
    }

    // Handle reconnection — update socket ID if the player is already in
    const existingPlayer = game.players.find(p => p.id === user.id || p.socketId === socket.id);
    if (existingPlayer) {
      if (existingPlayer.socketId !== socket.id) {
        existingPlayer.socketId = socket.id;
        logger.info(`[GAME] Player ${user.name} reconnected to game ${gameId}`);
      }
      socket.join(gameId);
      socket.emit('game:player_joined', { players: game.players, user });
      return;
    }

    // Capacity check (snake allows unlimited, others capped at 2)
    if (game.players.length >= 2 && game.gameType !== 'snake') {
      socket.emit('game:error', { message: 'Game is full' });
      logger.info(`[GAME] Game ${gameId} is full, rejecting ${user.name}`);
      return;
    }

    const newPlayer = { id: user.id, name: user.name, socketId: socket.id };
    game.players.push(newPlayer);
    socket.join(gameId);

    // Notify the joiner, then broadcast to others
    socket.emit('game:player_joined', { players: game.players, user: newPlayer });
    socket.to(gameId).emit('game:player_joined', { players: game.players, user: newPlayer });

    logger.info(`[GAME] ${user.name} (${user.id}) joined game ${gameId}. Total players: ${game.players.length}`);

    io.emit('game:lobby_updated', {
      gameId,
      gameType: game.gameType,
      players: game.players.length,
      maxPlayers: 2,
      hostName: game.players[0].name,
      action: 'updated',
    });
  });

  // ── game:invite — Host invites a friend ──────────────────────
  socket.on(
    'game:invite',
    async ({ gameId, friendId, user }: { gameId: string; friendId: string; user: { id: string; name: string } }) => {
      if (!(await checkRateLimitAsync(socket.id))) {
        socket.emit('game:error', { message: 'Too many requests' });
        return;
      }
      const game = gameRooms.get(gameId);
      if (!game || game.hostId !== user.id) {
        socket.emit('game:error', { message: 'Unauthorized' });
        return;
      }

      const friendSocketId = userSockets.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit('game:invitation', {
          gameId,
          gameType: game.gameType,
          from: user,
        });
      } else {
        socket.emit('game:error', { message: 'Friend is not online' });
      }
    }
  );

  // ── game:move — Broadcast a player's move to opponents ───────
  socket.on(
    'game:move',
    async ({ gameId, move, user }: { gameId: string; move: Record<string, unknown>; user: { id: string } }) => {
      if (!(await checkRateLimitAsync(socket.id))) {
        socket.emit('game:error', { message: 'Too many requests' });
        return;
      }
      const game = gameRooms.get(gameId);
      if (!game) return;

      if (!game.players.find(p => p.id === user.id)) {
        socket.emit('game:error', { message: 'Not in game' });
        return;
      }

      game.gameState = { ...game.gameState, ...move };
      socket.to(gameId).emit('game:move_received', { move, from: user });
    }
  );

  // ── game:state_update — Full state sync (host → all) ────────
  socket.on(
    'game:state_update',
    async ({ gameId, state, user }: { gameId: string; state: Record<string, unknown>; user: { id: string } }) => {
      if (!(await checkRateLimitAsync(socket.id))) {
        socket.emit('game:error', { message: 'Too many requests' });
        return;
      }
      const game = gameRooms.get(gameId);
      if (!game) return;

      game.gameState = state;
      socket.to(gameId).emit('game:state_sync', { state, from: user });
    }
  );

  // ── game:leave — Player leaves a game ────────────────────────
  socket.on('game:leave', ({ gameId, user }: { gameId: string; user: { id: string; name: string } }) => {
    if (!gameId || !user) {
      logger.warn(`[GAME] Invalid leave request: gameId=${gameId}, user=`, user);
      return;
    }

    const game = gameRooms.get(gameId);
    if (!game) {
      logger.warn(`[GAME] Leave requested for non-existent game: ${gameId}`);
      return;
    }

    const initialLength = game.players.length;
    game.players = game.players.filter(p => p.id !== user.id && p.socketId !== socket.id);
    socket.leave(gameId);

    if (game.players.length !== initialLength) {
      io.to(gameId).emit('game:player_left', { players: game.players, user });
      logger.info(`[GAME] ${user.name} left game ${gameId}. Remaining players: ${game.players.length}`);
    }

    if (game.players.length === 0) {
      const gameType = game.gameType;
      gameRooms.delete(gameId);
      logger.info(`[GAME] Game ${gameId} deleted (no players)`);
      io.emit('game:lobby_updated', { gameId, gameType, players: 0, maxPlayers: 2, action: 'deleted' });
    } else {
      io.emit('game:lobby_updated', {
        gameId,
        gameType: game.gameType,
        players: game.players.length,
        maxPlayers: 2,
        hostName: game.players[0]?.name || 'Unknown',
        action: 'updated',
      });
    }
  });

  // ── game:get_lobbies — List available game rooms ─────────────
  socket.on('game:get_lobbies', ({ gameType }: { gameType?: string }) => {
    const lobbies = Array.from(gameRooms.entries())
      .filter(([, game]) => !gameType || game.gameType === gameType)
      .filter(([, game]) => game.players.length < 2) // Only non-full games
      .map(([id, game]) => ({
        gameId: id,
        gameType: game.gameType,
        players: game.players.length,
        maxPlayers: 2,
        hostName: game.players[0]?.name || 'Unknown',
      }));
    socket.emit('game:lobbies_list', { lobbies });
  });
}
