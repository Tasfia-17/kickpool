'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Users, RefreshCw, ArrowRight, Wifi, ArrowLeft } from 'lucide-react';

interface GameLobby {
  gameId: string;
  gameType: string;
  players: number;
  maxPlayers: number;
  hostName: string;
}

interface GameLobbyBrowserProps {
  gameType: string;
  onJoinGame: (gameId: string) => void;
  onCreateGame: () => void;
  onBack?: () => void;
}

export function GameLobbyBrowser({ gameType, onJoinGame, onCreateGame, onBack }: GameLobbyBrowserProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const computeSocketUrl = () => {
      if (typeof window === 'undefined') return 'http://localhost:4000';
      try {
        const { protocol, hostname, port } = window.location;
        if (hostname.includes('-3000.')) {
          return `${protocol}//${hostname.replace('-3000.', '-4000.')}`;
        }
        if (port) {
          return `${protocol}//${hostname}:4000`;
        }
        return `${protocol}//${hostname}:4000`;
      } catch {
        return 'http://localhost:4000';
      }
    };

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || computeSocketUrl());
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      // Request lobby list when connected
      newSocket.emit('game:get_lobbies', { gameType });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('game:lobbies_list', ({ lobbies }: { lobbies: GameLobby[] }) => {
      setLobbies(lobbies);
      setLoading(false);
    });

    newSocket.on('game:lobby_updated', ({ gameId, gameType: updatedGameType, players, maxPlayers, hostName, action }: any) => {
      if (updatedGameType !== gameType) return; // Only update if it&apos;s our game type
      
      setLobbies(prev => {
        if (action === 'deleted') {
          return prev.filter(l => l.gameId !== gameId);
        }
        
        const existing = prev.findIndex(l => l.gameId === gameId);
        if (existing >= 0) {
          // Update existing lobby
          const updated = [...prev];
          updated[existing] = { gameId, gameType: updatedGameType, players, maxPlayers, hostName };
          return updated;
        } else if (action === 'created' && players < maxPlayers) {
          // Add new lobby
          return [...prev, { gameId, gameType: updatedGameType, players, maxPlayers, hostName }];
        }
        return prev;
      });
    });

    return () => {
      newSocket.close();
    };
  }, [session, gameType]);

  const refreshLobbies = () => {
    if (socket && connected) {
      setLoading(true);
      socket.emit('game:get_lobbies', { gameType });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0f380f] text-[#9ca04c] p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b-2 border-[#0f380f] pb-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-[#0f380f]/50 rounded transition-colors"
              title="Back"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          <Wifi size={12} className={connected ? 'text-green-500 animate-pulse' : 'text-red-500'} />
          <span className="text-xs font-bold">PUBLIC LOBBIES</span>
        </div>
        <button
          onClick={refreshLobbies}
          disabled={!connected || loading}
          className="p-1 hover:bg-[#0f380f]/50 rounded transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lobby List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-xs opacity-50 py-4">Loading lobbies...</div>
        ) : lobbies.length === 0 ? (
          <div className="text-center text-xs opacity-50 py-4">
            <p>No open lobbies</p>
            <p className="text-[10px] mt-1">Create one to start!</p>
          </div>
        ) : (
          lobbies.map((lobby) => (
            <motion.button
              key={lobby.gameId}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onJoinGame(lobby.gameId)}
              className="w-full p-2 bg-[#0f380f]/30 border-2 border-[#0f380f] hover:border-[#9ca04c] transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs">{lobby.gameId}</span>
                    <span className="text-[10px] opacity-70">by {lobby.hostName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-70">
                    <Users size={10} />
                    <span>{lobby.players}/{lobby.maxPlayers} players</span>
                  </div>
                </div>
                <ArrowRight size={14} className="opacity-50" />
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Create Game Button */}
      <button
        onClick={onCreateGame}
        disabled={!connected}
        className="mt-3 w-full p-2 border-2 border-[#0f380f] bg-[#0f380f]/50 hover:bg-[#0f380f] hover:text-[#9ca04c] transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Users size={12} />
        CREATE NEW LOBBY
      </button>
    </div>
  );
}
