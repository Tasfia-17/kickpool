'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Socket } from 'socket.io-client';
import { UserProfilePopup } from './UserProfilePopup';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { getCachedRoomUsers, subscribeCachedRoomUsers } from '@/hooks/useSocket';
import { RefreshCw, Shield, ShieldOff } from 'lucide-react';

interface User {
  id: string;
  name: string;
  image?: string;
  socketId: string;
  isVIP?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipBadge?: string;
  vipGlow?: boolean;
}

interface UserListProps {
  socket: Socket | null;
  roomId: string;
  hostId?: string;
  currentUserId?: string;
  coHostIds?: string[];
}

export const UserList: React.FC<UserListProps> = ({ socket, roomId, hostId, currentUserId, coHostIds = [] }) => {
  // Initialize from module-level cache — this is the key fix for the race condition.
  // The cache is populated at the socket layer BEFORE this lazy-loaded component mounts.
  const [users, setUsers] = useState<User[]>(() => getCachedRoomUsers(roomId));
  const [selectedUser, setSelectedUser] = useState<{ username: string; x: number; y: number } | null>(null);
  const { isDarkMode } = usePokemonTheme();

  // ═══════════════════════════════════════════════════════════════
  // SINGLE SOURCE OF TRUTH: subscribe to the module-level cache.
  // No direct socket.on('room:users_update') — the cache in
  // useSocket.ts is the only listener for that event.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    return subscribeCachedRoomUsers(roomId, (updatedUsers) => {
      setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
    });
  }, [roomId]);

  // Fallback: always request fresh users on reconnect.
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      socket.emit('room:get_users', { roomId });
    };

    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket, roomId]);

  const handleKick = (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!socket) return;
    if (confirm('Are you sure you want to kick this user?')) {
      socket.emit('room:kick', { roomId, targetUserId });
    }
  };

  const handlePromoteCoHost = (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!socket) return;
    socket.emit('room:set-cohost', { roomId, targetUserId, action: 'promote' });
  };

  const handleDemoteCoHost = (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!socket) return;
    socket.emit('room:set-cohost', { roomId, targetUserId, action: 'demote' });
  };

  const handleUserClick = (e: React.MouseEvent, username: string) => {
    // Don't open if clicking kick button (handled by stopPropagation, but good to be safe)
    setSelectedUser({
        username,
        x: e.clientX,
        y: e.clientY
    });
  };

  const refreshUsers = () => {
    if (socket) {
        socket.emit('room:get_users', { roomId });
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden relative transition-colors"
      style={{ backgroundColor: isDarkMode ? 'black' : 'white' }}
    >
      {selectedUser && (
        <UserProfilePopup
            username={selectedUser.username}
            position={{ x: selectedUser.x, y: selectedUser.y }}
            roomId={roomId}
            onClose={() => setSelectedUser(null)}
            openProfilePage={() => {
              window.open(`/profile/${selectedUser.username}`, '_blank');
              setSelectedUser(null);
            }}
        />
      )}
      <div
        className="flex justify-between items-center p-1 sm:p-2 border-b-2 border-black transition-colors"
        style={{ backgroundColor: isDarkMode ? '#333' : '#f3f4f6' }}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`text-[10px] sm:text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{users.length} Online</span>
          {socket && (
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${socket.connected ? 'bg-green-500' : 'bg-red-500'}`}
              title={socket.connected ? 'Connected' : 'Disconnected'}
            />
          )}
        </div>
        <button 
          type="button" 
          onClick={refreshUsers} 
          className="text-[10px] sm:text-xs hover:text-[#ff69b4] font-bold p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500" 
          title="Refresh List"
          aria-label="Refresh user list"
        >
            <RefreshCw size={12} className="sm:w-4 sm:h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1 sm:p-2 space-y-1 sm:space-y-2">
        {users.length === 0 && (
            <div className={`text-center italic p-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No users visible.<br/>
                <button type="button" onClick={refreshUsers} className={`underline mt-2 ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>Refresh?</button>
            </div>
        )}
        {users.map((user) => (
          <div
            key={user.socketId}
            onClick={(e) => handleUserClick(e, user.name)}
            className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] sm:hover:translate-x-[1px] sm:hover:translate-y-[1px] sm:hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer ${isDarkMode ? 'active:bg-gray-900 sm:hover:bg-gray-900' : 'active:bg-gray-50 sm:hover:bg-gray-50'} ${user.isFounder ? 'border-purple-500 bg-gradient-to-r from-purple-900/20 to-pink-900/20' : user.isVIP ? 'border-yellow-400' : 'border-black'}`}
            style={{ backgroundColor: user.isFounder ? undefined : (isDarkMode ? 'black' : 'white') }}
          >
            {/* Founder Crown or VIP Badge */}
            {user.isFounder ? (
              <span className="text-base sm:text-lg animate-pulse">👑</span>
            ) : user.isVIP && user.vipBadge && (
              <span className="text-base sm:text-lg">{user.vipBadge}</span>
            )}
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name}
                width={32}
                height={32}
                unoptimized
                className={`w-7 h-7 sm:w-8 sm:h-8 border-2 object-cover ${user.isFounder ? 'border-purple-500 ring-2 ring-purple-400' : user.isVIP ? 'border-yellow-400' : 'border-black'}`}
              />
            ) : (
              <div className={`w-7 h-7 sm:w-8 sm:h-8 border-2 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white ${user.isFounder ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400' : user.isVIP ? 'bg-[#ff69b4] border-yellow-400' : 'bg-[#ff69b4] border-black'}`}>
                {user.name[0].toUpperCase()}
              </div>
            )}
            <span
              className={`text-xs sm:text-sm font-bold truncate flex-1 ${user.isFounder ? 'founder-name-gradient animate-founder-glow' : ''}`}
              style={{
                color: user.isFounder ? undefined : (user.isVIP && user.vipNameColor ? user.vipNameColor : (isDarkMode ? 'white' : 'black')),
                textShadow: user.isFounder ? undefined : (user.isVIP && user.vipGlow && user.vipNameColor ? `0 0 8px ${user.vipNameColor}, 0 0 16px ${user.vipNameColor}` : 'none'),
                '--glow-color': user.isVIP ? user.vipNameColor : undefined,
              } as React.CSSProperties}
            >
              {user.name}
              {user.isFounder ? <span className="ml-1">✨</span> : user.isVIP && <span className="ml-1 text-yellow-500">★</span>}
            </span>
            {user.isFounder && (
              <span className="hidden sm:inline text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 border border-purple-400 rounded animate-pulse">
                FOUNDER
              </span>
            )}
            {hostId && user.id === hostId && !user.isFounder && (
              <span className="text-[8px] sm:text-[10px] font-bold bg-yellow-300 text-black px-1.5 sm:px-2 py-0.5 border border-black">
                HOST
              </span>
            )}
            {user.id !== hostId && coHostIds.includes(user.id) && (
              <span className="text-[8px] sm:text-[10px] font-bold bg-blue-400 text-white px-1.5 sm:px-2 py-0.5 border border-black flex items-center gap-0.5">
                <Shield size={8} />CO-HOST
              </span>
            )}
            {hostId === currentUserId && user.id !== currentUserId && user.id !== hostId && (
              <button
                onClick={(e) => coHostIds.includes(user.id)
                  ? handleDemoteCoHost(e, user.id)
                  : handlePromoteCoHost(e, user.id)}
                className="ml-0.5 p-1 rounded transition-colors hover:bg-blue-500/10"
                title={coHostIds.includes(user.id) ? 'Remove co-host' : 'Make co-host'}
              >
                {coHostIds.includes(user.id)
                  ? <ShieldOff size={11} className="text-blue-400" />
                  : <Shield size={11} className="text-blue-400" />}
              </button>
            )}
            {(hostId === currentUserId || coHostIds.includes(currentUserId || '')) && user.id !== currentUserId && (
              <button
                onClick={(e) => handleKick(e, user.id)}
                className="ml-0.5 sm:ml-1 text-[8px] sm:text-[10px] font-bold text-white bg-red-500 border border-black px-1.5 sm:px-2 py-0.5 sm:py-1 active:bg-red-600 active:translate-y-[1px] sm:hover:bg-red-600 min-h-[28px] min-w-[36px] flex items-center justify-center"
              >
                KICK
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
