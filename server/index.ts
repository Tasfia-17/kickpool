/**
 * CinePurr — Server Entry Point (Orchestrator)
 *
 * This is the THIN orchestrator that replaces the original 2391-line
 * monolithic index.ts. It owns ONLY infrastructure concerns:
 *   • Express / HTTP / Socket.io setup
 *   • CORS configuration
 *   • Redis adapter initialization
 *   • Authentication middleware registration
 *   • Domain handler registration (Strangler Fig wiring)
 *   • REST API routes (presence, admin, health)
 *   • Background interval bootstrapping
 *   • Graceful shutdown
 *
 * All business logic lives in the domain handlers:
 *   handlers/roomHandler.ts   — Room lifecycle + queue
 *   handlers/chatHandler.ts   — Chat + Write-Behind caching
 *   handlers/videoHandler.ts  — Video sync + Soft Correction
 *   handlers/gameHandler.ts   — Multiplayer mini-games
 *   handlers/presenceHandler.ts — Presence + DMs + disconnect cleanup
 */

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';

// ── Infrastructure ──────────────────────────────────────────────
import logger from '../src/lib/logger';
import { setupSocketRedisAdapter } from '../src/lib/socketRedisAdapter';
import { exposeMetrics, observeRequest } from '../src/lib/metrics';
import { prisma, initDatabasePragmas } from './lib/prismaTypes';

// ── Middleware ───────────────────────────────────────────────────
import { socketAuthMiddleware } from './middleware/auth';

// ── Domain Handlers ─────────────────────────────────────────────
import { registerRoomHandlers } from './handlers/roomHandler';
import { registerChatHandlers } from './handlers/chatHandler';
import { registerVideoHandlers } from './handlers/videoHandler';
import { registerGameHandlers } from './handlers/gameHandler';
import { registerPresenceHandlers } from './handlers/presenceHandler';
import { registerMatchHandlers, bootstrapAllActivePools } from './handlers/matchHandler';
import { replayHandler } from './handlers/replayHandler';

// ── Centralized State ───────────────────────────────────────────
import {
  rooms,
  userSockets,
  startCleanupIntervals,
  cancelRoomDeletion,
  debouncedBroadcastRoomList,
} from './state';

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

logger.info(
  `Starting socket server. NODE_ENV=${process.env.NODE_ENV}, LOG_LEVEL=${process.env.LOG_LEVEL}`
);

function getAdminApiSecret(): string {
  return process.env.ADMIN_API_KEY || process.env.NEXTAUTH_SECRET || '';
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

initDatabasePragmas().catch(() => {});

// ============================================
// EXPRESS + HTTP SERVER
// ============================================

const app = express();
app.use(observeRequest);
exposeMetrics(app);

// ── CORS Configuration ─────────────────────────────────────────
const PUBLIC_TUNNEL = process.env.ALLOW_PUBLIC_TUNNEL === '1' || process.env.PUBLIC_TUNNEL === '1';
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const TUNNEL_ORIGIN_PATTERNS: RegExp[] = [
  /https?:\/\/.*\.devtunnels\.ms$/,
  /https?:\/\/.*\.ngrok(?:-free)?\.dev$/,
  /https?:\/\/.*\.ngrok\.io$/,
  /https?:\/\/.*\.ngrok-free\.app$/,
  /https?:\/\/.*\.loca\.lt$/,
  /https?:\/\/.*\.loca\.it$/,
  /https?:\/\/.*\.trycloudflare\.com$/,
  /https?:\/\/.*\.netlify\.app$/,
];

let allowedOrigins: (string | RegExp)[];
if (CORS_ORIGIN) {
  allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
  logger.info(`[CORS] Using CORS_ORIGIN from environment: ${CORS_ORIGIN}`);
} else if (PUBLIC_TUNNEL && process.env.NODE_ENV !== 'production') {
  allowedOrigins = [
    'http://localhost:3000', 'http://localhost:4000',
    'https://cinepurr.netlify.app',
    ...TUNNEL_ORIGIN_PATTERNS,
  ];
  logger.warn('[CORS] Tunnel origins enabled (DEV ONLY). Disable PUBLIC_TUNNEL in production.');
} else {
  allowedOrigins = [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3001', 'http://127.0.0.1:3001',
  ];
}
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Health Check ────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.send('Socket server is running!');
});

const httpServer = createServer(app);
if (process.env.NODE_ENV !== 'production') {
  httpServer.setMaxListeners(20);
}

// ============================================
// SOCKET.IO SERVER
// ============================================

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Redis Adapter (optional, for horizontal scaling) ────────────
setupSocketRedisAdapter(io)
  .then(success => {
    if (success) logger.info('Redis adapter enabled — multi-instance scaling supported');
    else logger.info('Redis adapter disabled — running in single-instance mode');
  })
  .catch(err => logger.warn('Redis adapter setup failed:', err.message || err));

// ── Authentication Middleware ────────────────────────────────────
io.use(socketAuthMiddleware);

// ============================================
// CONNECTION — REGISTER DOMAIN HANDLERS
// ============================================

io.on('connection', (socket) => {
  const isGuest = (socket as any).isGuest === true;
  const userName = (socket as any).userName;
  const userId = (socket as any).userId;

  logger.info(
    `New client connected: ${socket.id} (${isGuest ? 'guest' : `user ${userName} [${userId}]`})`
  );

  // Register all domain handlers on this socket
  registerRoomHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerVideoHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerPresenceHandlers(io, socket);
  registerMatchHandlers(io, socket);
});

// ============================================
// REST API ROUTES
// ============================================

// ── Presence: single user ───────────────────────────────────────
app.get('/api/presence/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  for (const [roomId, room] of Array.from(rooms.entries())) {
    const found = room.users.find(u => u.id === userId);
    if (found) {
      return res.json({ roomId, videoTitle: room.currentVideo?.title || '', userCount: room.users.length });
    }
  }
  return res.json(null);
});

// ── Presence: batch check ───────────────────────────────────────
app.post('/api/presence/batch', express.json(), (req: Request, res: Response) => {
  const { userIds } = req.body as { userIds: string[] };
  if (!Array.isArray(userIds)) return res.json({});
  const result: Record<string, { roomId: string; videoTitle: string; userCount: number } | null> = {};
  for (const uid of userIds) {
    result[uid] = null;
    for (const [roomId, room] of Array.from(rooms.entries())) {
      if (room.users.find(u => u.id === uid)) {
        result[uid] = { roomId, videoTitle: room.currentVideo?.title || '', userCount: room.users.length };
        break;
      }
    }
  }
  return res.json(result);
});

// ── Online users ────────────────────────────────────────────────
app.get('/api/online', (_req: Request, res: Response) => {
  return res.json({ onlineUsers: Array.from(userSockets.keys()) });
});

app.post('/api/online/batch', express.json(), (req: Request, res: Response) => {
  const { userIds } = req.body as { userIds: string[] };
  if (!Array.isArray(userIds)) return res.json({});
  const result: Record<string, boolean> = {};
  for (const uid of userIds) result[uid] = userSockets.has(uid);
  return res.json(result);
});

// ── Match Replay (demo / judge review) ───────────────────────────────────
app.post('/api/admin/replay', express.json(), replayHandler(io));

// ── Admin: Global Broadcast ─────────────────────────────────────
app.post('/api/admin/broadcast', express.json(), (req: Request, res: Response) => {
  const { secret, message } = req.body;
  const adminApiSecret = getAdminApiSecret();

  if (!adminApiSecret) return res.status(403).json({ error: 'Admin bridge secret not configured' });
  if (secret !== adminApiSecret) return res.status(403).json({ error: 'Unauthorized broadcast' });

  io.emit('chat:broadcast', {
    id: `broadcast-${Date.now()}`,
    user: 'SERVER BROADCAST',
    text: message,
    timestamp: Date.now(),
    isSystem: true, isBroadcast: true, isVIPAdmin: true,
    vipNameColor: '#ff0000', vipBadge: '🚨', vipGlow: true,
  });
  return res.json({ success: true, message: 'Broadcast sent to all connected clients' });
});

// ── Admin: Force-Close Room ─────────────────────────────────────
app.delete('/api/admin/rooms/:roomId', express.json(), (req: Request, res: Response) => {
  const { secret } = req.body;
  const adminApiSecret = getAdminApiSecret();
  if (!adminApiSecret) return res.status(403).json({ error: 'Admin bridge secret not configured' });
  if (secret !== adminApiSecret) return res.status(403).json({ error: 'Unauthorized' });

  const roomId = req.params.roomId;
  io.to(roomId).emit('room:deleted', { message: 'This room has been forcibly closed by an Administrator.', roomId });
  rooms.delete(roomId);
  cancelRoomDeletion(roomId);
  debouncedBroadcastRoomList(io);
  return res.json({ success: true });
});

// ── Admin: AI Office Broadcast ──────────────────────────────────
app.post('/api/admin/ai-office', express.json(), (req: Request, res: Response) => {
  const { secret, event } = req.body;
  const adminApiSecret = getAdminApiSecret();
  if (!adminApiSecret) return res.status(403).json({ error: 'Admin bridge secret not configured' });
  if (secret !== adminApiSecret) return res.status(403).json({ error: 'Unauthorized' });

  // Broadcast the AI Office event to all connected clients
  io.emit('ai-office:event', event);
  return res.json({ success: true });
});

// ── Admin: Update Room ──────────────────────────────────────────
app.patch('/api/admin/rooms/:roomId', express.json(), async (req: Request, res: Response) => {
  const { secret, maxUsers } = req.body;
  const adminApiSecret = getAdminApiSecret();
  if (!adminApiSecret) return res.status(403).json({ error: 'Admin bridge secret not configured' });
  if (secret !== adminApiSecret) return res.status(403).json({ error: 'Unauthorized' });

  const roomId = req.params.roomId;
  const room = rooms.get(roomId);

  if (room && typeof maxUsers === 'number') {
    try {
      await prisma.room.update({ where: { id: roomId }, data: { maxUsers } });
    } catch (err: unknown) {
      logger.warn(`[ADMIN] Failed to persist maxUsers for room ${roomId}:`, (err as Error).message || err);
    }
    io.to(roomId).emit('chat:broadcast', {
      id: `sys-${Date.now()}`, user: 'SYSTEM',
      text: `Room capacity updated to ${maxUsers} by Administrator.`,
      timestamp: Date.now(), isSystem: true,
    });
  }

  debouncedBroadcastRoomList(io);
  return res.json({ success: true });
});

// ============================================
// START SERVER & BACKGROUND TASKS
// ============================================

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, async () => {
  logger.info(`Socket server running on port ${PORT} (bound to ${HOST})`);
  logger.info(`NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, HOST=${HOST}`);

  // Sanitize database on boot
  try {
    await prisma.room.updateMany({ data: { onlineCount: 0 } });
    logger.info('[BOOT] Database sanitized: All room counts reset to 0.');
  } catch (err: unknown) {
    logger.error('[BOOT] Failed to sanitize database:', (err as Error).message || err);
  }

  // Start all background cleanup intervals AFTER server is ready
  startCleanupIntervals(io);

  // Bootstrap TxLINE SSE streams for all active pools
  bootstrapAllActivePools(io).catch(err => {
    logger.warn('[BOOT] bootstrapAllActivePools failed:', (err as Error).message);
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().then(() => {
      logger.info('Prisma disconnected');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().then(() => {
      logger.info('Prisma disconnected');
      process.exit(0);
    });
  });
});
