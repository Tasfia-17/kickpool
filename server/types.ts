/**
 * CinePurr Server — Shared Type Definitions
 *
 * Single source of truth for all server-side interfaces.
 * Domain, infrastructure, and delivery layers import from here.
 */

import { Socket, Server } from 'socket.io';

// ============================================
// SOCKET AUTHENTICATION
// ============================================

/** Socket extended with verified auth properties injected by middleware */
export interface AuthenticatedSocket extends Socket {
  userId: string | null;
  userName: string | null;
  userRole: string;
  isGuest: boolean;
}

// ============================================
// DOMAIN: VIP
// ============================================

export interface VipInfo {
  isVIP: boolean;
  isFounder: boolean;
  vipNameColor?: string | null;
  vipFont?: string | null;
  vipBadge?: string | null;
  vipGlow?: boolean;
  role?: string;
  watchTime?: number;
}

// ============================================
// DOMAIN: VIDEO
// ============================================

export interface VideoSource {
  url: string;
  title: string;
  provider: 'youtube' | 'vimeo' | 'mp4' | 'movie' | 'iptv';
}

// ============================================
// DOMAIN: QUEUE
// ============================================

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  provider: string;
  addedBy: string;
  votes: number;
  voters: string[];
  thumbnail?: string;
}

// ============================================
// DOMAIN: ROOM
// ============================================

export interface RoomUser {
  id: string;
  name: string;
  image?: string;
  socketId: string;
  isVIP?: boolean;
  isVIPAdmin?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipBadge?: string;
  vipGlow?: boolean;
  watchTime?: number;
  petFamily?: string;
  petName?: string;
}

export interface RoomState {
  isPlaying: boolean;
  timestamp: number;
  lastUpdated: number;
  currentVideo?: VideoSource;
  users: RoomUser[];
  hostId?: string;
  coHostIds: string[];
  queue: QueueItem[];
  typingUsers: Set<string>;
}

// ============================================
// DOMAIN: GAMES
// ============================================

export interface GamePlayer {
  id: string;
  name: string;
  socketId: string;
}

export interface GameRoom {
  gameType: string;
  players: GamePlayer[];
  gameState: Record<string, unknown>;
  hostId: string;
}

// ============================================
// DOMAIN: WATCH TRACKING
// ============================================

export interface WatchTrackingEntry {
  odaId: string;    // roomId
  userId: string;
  lastUpdate: number;
}

// ============================================
// DOMAIN: VIP CACHE
// ============================================

export interface VipCacheEntry {
  expires: number;
  data: VipInfo;
}

// ============================================
// INFRASTRUCTURE: PRISMA ERROR
// ============================================

export interface PrismaError extends Error {
  code?: string;
}

// ============================================
// HANDLER REGISTRATION
// ============================================

/**
 * Each domain handler exports a `register` function matching this signature.
 * Called once per connected socket in the io.on('connection') callback.
 */
export type HandlerRegistration = (io: Server, socket: Socket) => void;
