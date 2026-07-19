import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { ensureSocket, fetchSocketToken, getExistingSocket } from './useSocket';

/**
 * Lightweight global socket hook for non-room pages (e.g., home page).
 * Reuses the SAME singleton socket connection from `useSocket` and provides
 * event subscription helpers.
 *
 * Unlike `useSocket`, this does NOT join a room — it's used for global
 * server-pushed events like `rooms:list`, `game:lobby_updated`, etc.
 *
 * ⚠️  Previously this file declared its own `let globalSocket` which created
 *     a second, unauthenticated WebSocket connection. Now it delegates to
 *     `useSocket.ts`'s `ensureSocket()` so only ONE connection exists app-wide.
 */

export function useGlobalSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // If useSocket already created a connection (e.g., user came from a room page),
      // reuse it immediately.
      const existing = getExistingSocket();
      if (existing) {
        if (!cancelled) setSocket(existing);
        return;
      }

      // Otherwise, create the singleton with proper auth — same as useSocket does
      const token = await fetchSocketToken();
      if (cancelled) return;
      const sock = ensureSocket(token);
      setSocket(sock);
    };

    init();

    return () => {
      cancelled = true;
      // Don't disconnect on unmount — singleton stays alive
    };
  }, []);

  /**
   * Subscribe to a socket event. The listener is cleaned up on unmount automatically.
   */
  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      socket?.on(event, handler);
      return () => { socket?.off(event, handler); };
    },
    [socket]
  );

  return { socket, on };
}
