/**
 * CinePurr — React 19 Room Sync Store
 *
 * Provides a `useSyncExternalStore`-based hook for subscribing to
 * real-time room state via Socket.io. This replaces `useEffect`-based
 * state syncing that is susceptible to "tearing" during React 19's
 * concurrent rendering.
 *
 * @see PDF Section 2 — "Optimizing Client-Side Real-Time Synchronization"
 *
 * Usage:
 * ```tsx
 * import { useRoomSync } from '@/stores/roomSyncStore';
 *
 * function VideoPlayer({ roomId }: { roomId: string }) {
 *   const { isPlaying, timestamp, currentVideo, users, hostId } = useRoomSync(roomId);
 *   // React guarantees this snapshot is consistent within a render —
 *   // no "tearing" even during concurrent transitions.
 * }
 * ```
 */

import { useSyncExternalStore, useMemo, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getExistingSocket, subscribeCachedRoomUsers } from '@/hooks/useSocket';

// ============================================
// TYPES
// ============================================

interface VideoSource {
  url: string;
  title: string;
  provider: 'youtube' | 'vimeo' | 'mp4' | 'movie' | 'iptv';
}

interface RoomUser {
  id: string;
  name: string;
  image?: string;
  socketId: string;
  isVIP?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipBadge?: string;
  vipGlow?: boolean;
  watchTime?: number;
  petFamily?: string;
  petName?: string;
}

export interface RoomSyncState {
  isPlaying: boolean;
  timestamp: number;
  lastUpdated: number;
  currentVideo?: VideoSource;
  users: RoomUser[];
  hostId?: string;
  coHostIds: string[];
  /** Drift correction metadata (from video handler) */
  driftThresholds?: {
    inSync: number;
    softCorrection: number;
    gain: number;
    maxDeviation: number;
  };
  correctionStrategy?: 'none' | 'soft' | 'hard';
  suggestedPlaybackRate?: number;
  forcedSeek?: boolean;
}

// ============================================
// EXTERNAL STORE CLASS
// ============================================

/**
 * RoomSyncStore encapsulates Socket.io event subscriptions and provides
 * the subscribe/getSnapshot interface required by useSyncExternalStore.
 *
 * Key guarantees:
 *   1. Immutable snapshots — each state update creates a new object reference
 *   2. No stale closures — listeners always reference the latest state
 *   3. Concurrent-safe — React 19 can call getSnapshot at any time
 */
class RoomSyncStore {
  private snapshot: RoomSyncState;
  private listeners = new Set<() => void>();
  private socket: Socket | null = null;
  private roomId: string;
  private isSubscribed = false;
  private raceFixTimeout: ReturnType<typeof setTimeout> | undefined;
  private cacheUnsubscribe: (() => void) | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.snapshot = createDefaultState();
  }

  /** Subscribe to state changes (called by React's useSyncExternalStore) */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    // Attach socket listeners on first subscriber
    if (!this.isSubscribed) {
      this.attachSocketListeners();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.detachSocketListeners();
      }
    };
  };

  /** Get the current immutable snapshot (called by React during render) */
  getSnapshot = (): RoomSyncState => {
    return this.snapshot;
  };

  /** Server-side rendering fallback */
  getServerSnapshot = (): RoomSyncState => {
    return createDefaultState();
  };

  /** Force update the socket reference (e.g. after reconnection) */
  updateSocket(sock: Socket | null): void {
    if (this.socket === sock) return;
    this.detachSocketListeners();
    this.socket = sock;
    if (this.listeners.size > 0) {
      this.attachSocketListeners();
    }
  }

  // ── Internal ──────────────────────────────────────────────────

  private emitChange(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }

  private attachSocketListeners(): void {
    const sock = this.socket || getExistingSocket();
    if (!sock) return;

    this.socket = sock;
    this.isSubscribed = true;

    // player:sync — authoritative state from server
    sock.on('player:sync', (state: Partial<RoomSyncState>) => {
      // Create a new snapshot object (immutability guarantee)
      this.snapshot = {
        ...this.snapshot,
        ...state,
        // Preserve users if not included in this update
        users: state.users ?? this.snapshot.users,
      };
      this.emitChange();
    });

    // room:users_update — subscribe to the module-level cache (single source of truth)
    // instead of adding another direct socket listener.
    this.cacheUnsubscribe = subscribeCachedRoomUsers(this.roomId, (users: RoomUser[]) => {
      this.snapshot = { ...this.snapshot, users };
      this.emitChange();
    });

    // room:video_changed — new video selected
    sock.on('room:video_changed', (video: VideoSource) => {
      this.snapshot = { ...this.snapshot, currentVideo: video };
      this.emitChange();
    });

    // room:host_changed — host promotion
    sock.on('room:host_changed', ({ hostId }: { hostId: string }) => {
      this.snapshot = { ...this.snapshot, hostId };
      this.emitChange();
    });

    // room:cohost_updated — co-host list changes
    sock.on('room:cohost_updated', ({ coHostIds }: { coHostIds: string[] }) => {
      this.snapshot = { ...this.snapshot, coHostIds };
      this.emitChange();
    });

    // ── RACE CONDITION FIX ─────────────────────────────────────
    // On client-side navigation, the server may have already sent
    // the initial state before these listeners were attached.
    // Use room:request_full_state for atomic state recovery.
    if (sock.connected) {
      this.raceFixTimeout = setTimeout(() => {
        sock.emit('room:request_full_state', { roomId: this.roomId }, (response?: any) => {
          if (response?.ok) {
            this.snapshot = {
              ...this.snapshot,
              isPlaying: response.isPlaying ?? this.snapshot.isPlaying,
              timestamp: response.timestamp ?? this.snapshot.timestamp,
              lastUpdated: response.lastUpdated ?? this.snapshot.lastUpdated,
              currentVideo: response.currentVideo ?? this.snapshot.currentVideo,
              hostId: response.hostId ?? this.snapshot.hostId,
              coHostIds: response.coHostIds ?? this.snapshot.coHostIds,
            };
            this.emitChange();
          }
        });
      }, 1000);
    }
  }

  private detachSocketListeners(): void {
    if (this.raceFixTimeout) {
      clearTimeout(this.raceFixTimeout);
      this.raceFixTimeout = undefined;
    }

    if (!this.socket || !this.isSubscribed) return;

    // Clean up cache subscription
    if (this.cacheUnsubscribe) {
      this.cacheUnsubscribe();
      this.cacheUnsubscribe = null;
    }

    this.socket.off('player:sync');
    this.socket.off('room:video_changed');
    this.socket.off('room:host_changed');
    this.socket.off('room:cohost_updated');

    this.isSubscribed = false;
  }
}

// ============================================
// STORE INSTANCES (per roomId)
// ============================================

const storeCache = new Map<string, RoomSyncStore>();

function getOrCreateStore(roomId: string): RoomSyncStore {
  let store = storeCache.get(roomId);
  if (!store) {
    store = new RoomSyncStore(roomId);
    storeCache.set(roomId, store);
  }
  return store;
}

/** Clean up store when leaving a room */
export function disposeRoomStore(roomId: string): void {
  const store = storeCache.get(roomId);
  if (store) {
    // Unsubscribe all listeners by resetting
    storeCache.delete(roomId);
  }
}

// ============================================
// REACT HOOK
// ============================================

/**
 * Subscribe to real-time room state with React 19 concurrent safety.
 *
 * This hook uses `useSyncExternalStore` to guarantee that all components
 * reading room state see the same snapshot within a single render pass —
 * preventing "tearing" where a header shows 3 users but the sidebar shows 4.
 *
 * @param roomId — The room to subscribe to
 * @returns Immutable RoomSyncState snapshot
 */
export function useRoomSync(roomId: string): RoomSyncState {
  const store = useMemo(() => getOrCreateStore(roomId), [roomId]);

  // Keep the store's socket reference up to date
  useEffect(() => {
    const sock = getExistingSocket();
    store.updateSocket(sock);

    // Poll for socket availability (it may not exist yet on first render)
    const interval = setInterval(() => {
      const currentSock = getExistingSocket();
      if (currentSock) {
        store.updateSocket(currentSock);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [store]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

// ============================================
// HELPERS
// ============================================

function createDefaultState(): RoomSyncState {
  return {
    isPlaying: false,
    timestamp: 0,
    lastUpdated: 0,
    currentVideo: undefined,
    users: [],
    hostId: undefined,
    coHostIds: [],
  };
}
