import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/Toast';

// Singleton socket instance — keyed by whether we have a token or not
let globalSocket: Socket | null = null;
let currentSocketToken: string | null = null; // Track what token the socket was created with

// ═══════════════════════════════════════════════════════════════
// MODULE-LEVEL CACHE — SINGLE SOURCE OF TRUTH FOR ROOM USERS
// ═══════════════════════════════════════════════════════════════
//
// This solves the race condition where lazy-loaded components
// (UserList, TheaterRow, Chat) miss the initial room:users_update
// because their JS chunks haven't downloaded yet.
//
// ALL components subscribe to this cache instead of adding their
// own direct socket.on('room:users_update') listeners. This ensures:
//   1. Only ONE socket listener exists for room:users_update
//   2. The cache is populated from the ack callback (instant)
//      OR from the broadcast (backup) — whichever arrives first
//   3. Components always read from a warm cache on mount
//
const cachedRoomUsers = new Map<string, any[]>();
const cachedRoomUserSubscribers = new Map<string, Set<(users: any[]) => void>>();
let activeRoomUsersListener: ((users: any[]) => void) | null = null;
let activeRoomId: string | null = null;

/** Get the cached user list for a room. Components use this to initialize state. */
export function getCachedRoomUsers(roomId: string): any[] {
  return cachedRoomUsers.get(roomId) || [];
}

function publishCachedRoomUsers(roomId: string, users: any[]) {
  const userArray = Array.isArray(users) ? users : [];
  cachedRoomUsers.set(roomId, userArray);
  const subscribers = cachedRoomUserSubscribers.get(roomId);
  if (subscribers) {
    subscribers.forEach((subscriber) => subscriber(userArray));
  }
}

export function subscribeCachedRoomUsers(roomId: string, listener: (users: any[]) => void) {
  let subscribers = cachedRoomUserSubscribers.get(roomId);
  if (!subscribers) {
    subscribers = new Set();
    cachedRoomUserSubscribers.set(roomId, subscribers);
  }
  subscribers.add(listener);
  listener(getCachedRoomUsers(roomId));

  return () => {
    const currentSubscribers = cachedRoomUserSubscribers.get(roomId);
    if (!currentSubscribers) return;
    currentSubscribers.delete(listener);
    if (currentSubscribers.size === 0) {
      cachedRoomUserSubscribers.delete(roomId);
    }
  };
}

// Clean up socket on page unload to prevent stale connections
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      currentSocketToken = null;
    }
  });
}

// Compute the socket server URL from environment or window.location
const computeSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  try {
    const { protocol, hostname, port, origin } = window.location;
    if (hostname.includes('-3000.')) {
      return `${protocol}//${hostname.replace('-3000.', '-4000.')}`;
    }
    if (origin.includes('-3000')) {
      return origin.replace('-3000', '-4000');
    }
    if (port) {
      return `${protocol}//${hostname}:4000`;
    }
    return `${protocol}//${hostname}:4000`;
  } catch {
    return 'http://localhost:4000';
  }
};

// Fetch the raw NextAuth JWT from our API endpoint
// This is needed because the session cookie is httpOnly and can't be read from JS
const fetchSocketToken = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/auth/socket-token', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
};

// Export for reuse by useGlobalSocket (avoids creating a second singleton)
export { fetchSocketToken };

/** Returns the existing singleton (or null). Does NOT create a new connection. */
export const getExistingSocket = (): Socket | null => globalSocket;

// Create or reconnect the socket with the given token
export const ensureSocket = (token: string | null) => {
  // If we already have a socket with the same token, reuse it
  if (globalSocket && currentSocketToken === token) {
    return globalSocket;
  }

  // If we have a socket with a DIFFERENT token (e.g. was guest, now authenticated),
  // disconnect the old one and create a new one
  if (globalSocket) {
    if (process.env.NODE_ENV !== 'production') console.log('[useSocket] Reconnecting socket with new auth token');
    globalSocket.disconnect();
    globalSocket = null;
  }

  const socketUrl = computeSocketUrl();
  if (process.env.NODE_ENV !== 'production') console.log('[useSocket] Creating socket to:', socketUrl, token ? '(authenticated)' : '(guest)');

  globalSocket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 10000,
    auth: token ? { token } : undefined, // Pass the JWT in the handshake
  });

  currentSocketToken = token;
  return globalSocket;
};

export const useSocket = (roomId: string, user?: { id: string; name: string; image?: string | null; petFamily?: string; petName?: string }) => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const userRef = useRef(user);
  const joinedRoomRef = useRef<string | null>(null);
  const tokenFetchedRef = useRef(false);
  const retryTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  
  // Conditionally hook into toast to avoid breaking if used outside provider
  let addToastHook: ReturnType<typeof useToast>['addToast'] | undefined;
  try {
    const toastContext = useToast();
    addToastHook = toastContext.addToast;
  } catch (e) {
    // Ignore if not in a ToastProvider context
  }
  
  const hasShownToast = useRef(false);

  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initialize socket connection — fetch auth token first
  useEffect(() => {
    let cancelled = false;

    const initSocket = async () => {
      // Only fetch the token once per mount cycle
      if (!tokenFetchedRef.current) {
        tokenFetchedRef.current = true;
        const token = await fetchSocketToken();
        if (cancelled) return;
        const sock = ensureSocket(token);
        setSocketInstance(sock);
      } else {
        // Token already fetched — just ensure we have the socket
        if (!globalSocket) {
          const sock = ensureSocket(null);
          setSocketInstance(sock);
        } else {
          setSocketInstance(globalSocket);
        }
      }
    };

    initSocket();

    return () => {
      cancelled = true;
      // Don't disconnect on unmount — keep connection alive
    };
  }, []);

  // Re-fetch token and reconnect when user identity changes
  // This handles the case where the user was a guest and then logged in
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const updateAuth = async () => {
      const isGuest = user.id.startsWith('guest-');
      
      if (!isGuest) {
        // Authenticated user — fetch token and reconnect if needed
        const token = await fetchSocketToken();
        if (cancelled) return;
        
        if (token && token !== currentSocketToken) {
          // Token changed (e.g. was guest socket, now have real token)
          const sock = ensureSocket(token);
          setSocketInstance(sock);
          joinedRoomRef.current = null; // Force rejoin with new socket
        }
      } else if (!globalSocket) {
        // Guest user — connect without token
        const sock = ensureSocket(null);
        setSocketInstance(sock);
      }
    };

    updateAuth();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Handle room joining when socket + user are ready.
  // CRITICAL: socketInstance is in the dep array so this re-runs
  // when the async init effect resolves the socket.
  useEffect(() => {
    if (!socketInstance || !user) {
      return;
    }

    const joinRoom = () => {
      if (!userRef.current || !socketInstance) return;
      if (joinedRoomRef.current === roomId) return;

      // Never emit on an unconnected socket — defer to handleConnect
      if (!socketInstance.connected) return;

      const currentUser = userRef.current;

      // Register the cache listener BEFORE emitting room:join
      // so the server's immediate broadcast is always captured.
      if (activeRoomUsersListener) {
        socketInstance.off('room:users_update', activeRoomUsersListener);
      }

      activeRoomId = roomId;
      activeRoomUsersListener = (users: any[]) => {
        if (activeRoomId) {
          publishCachedRoomUsers(activeRoomId, users);
        }
      };
      socketInstance.on('room:users_update', activeRoomUsersListener);

      // Emit room:join with ack callback as PRIMARY delivery
      socketInstance.emit('room:join', { roomId, user: currentUser }, (response?: { ok?: boolean; users?: any[] }) => {
        if (response?.users && activeRoomId === roomId) {
          publishCachedRoomUsers(roomId, response.users);
        }
      });
      joinedRoomRef.current = roomId;
    };

    const handleConnect = () => {
      hasShownToast.current = false;
      // Only register presence if the socket was authenticated (has a token).
      // Guest sockets emitting a real user ID triggers AUTH_MISMATCH on the server.
      if (userRef.current && socketInstance && currentSocketToken) {
        socketInstance.emit('user:connect', { id: userRef.current.id });
      }
      joinedRoomRef.current = null;
      joinRoom();
    };

    const handleConnectError = (err: Error) => {
      if (addToastHook && !hasShownToast.current) {
        addToastHook({
          type: 'error',
          title: 'Connection Lost',
          message: 'Unable to connect to the real-time server. Features may be limited.',
        });
        hasShownToast.current = true;
      }
    };

    const handleDisconnect = () => {
      joinedRoomRef.current = null;
      if (activeRoomId) {
        publishCachedRoomUsers(activeRoomId, []);
        cachedRoomUsers.delete(activeRoomId);
        activeRoomId = null;
      }
    };

    const handleReconnectFailed = () => {
      if (addToastHook) {
        addToastHook({
          type: 'error',
          title: 'Connection Failed',
          message: 'Could not restore real-time connection. Please refresh the page.',
        });
      }
    };

    // Set up event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('reconnect_failed', handleReconnectFailed);

    // If already connected, join immediately
    if (socketInstance.connected) {
      joinRoom();
    }

    return () => {
      retryTimeoutsRef.current.forEach(t => clearTimeout(t));
      retryTimeoutsRef.current = [];

      socketInstance?.off('connect', handleConnect);
      socketInstance?.off('connect_error', handleConnectError);
      socketInstance?.off('disconnect', handleDisconnect);
      socketInstance?.off('reconnect_failed', handleReconnectFailed);
      joinedRoomRef.current = null;
    };
  }, [roomId, user?.id, user?.name, addToastHook, socketInstance]);

  return socketInstance;
};
