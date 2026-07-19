'use client';

import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, UserPlus, X, Search, Check, Clock, UserMinus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Link from 'next/link';
import DraggableMessage from './DraggableMessage';
import ChatWindow from './ChatWindow';
import DebugErrorBoundary from './DebugErrorBoundary';

interface Friend {
  id: string;
  username: string;
  image?: string;
  isOnline?: boolean;
  isVIP?: boolean;
  isFounder?: boolean;
}

interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    username: string;
    image?: string;
  };
  status: 'pending';
  createdAt: string;
}

const FriendsListComponent: React.FC = () => {
  const { data: session } = useSession();
  const { isDarkMode, currentTheme, pokemonSprite } = usePokemonTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [message, setMessage] = useState('');
  const [activeMessage, setActiveMessage] = useState<Friend | null>(null);
  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [openChats, setOpenChats] = useState<Friend[]>([]);
  const [friendPresence, setFriendPresence] = useState<Record<string, { roomId: string; videoTitle: string } | null>>({});

  // Safety guards to ensure arrays
  const safeFriends = Array.isArray(friends) ? friends : [];
  const safePendingRequests = Array.isArray(pendingRequests) ? pendingRequests : [];
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];
  const safeOpenChats = Array.isArray(openChats) ? openChats : [];

  useEffect(() => {
    if (session && isOpen) {
      const controller = new AbortController();
      fetchFriends(controller.signal);
      fetchPendingRequests(controller.signal);
      return () => controller.abort();
    }
  }, [session, isOpen]);

  // Fetch batch presence for all friends whenever the list changes
  useEffect(() => {
    if (safeFriends.length === 0) return;
    const controller = new AbortController();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    fetch(`${socketUrl}/api/presence/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: safeFriends.map(f => f.id) }),
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => setFriendPresence(data || {}))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Failed to fetch presence:', error);
      });
    return () => controller.abort();
  }, [friends]);

  const fetchFriends = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/friends', { signal });
      const data = await res.json();
      console.log('fetchFriends response:', data);
      if (res.ok) {
        if (Array.isArray(data)) {
          setFriends(data);
          // Keep openChats even if friend is not in new friends list
          setOpenChats(prev => prev.filter(f => data.some((d: any) => d.id === f.id)));
        } else {
          setFriends([]);
          setOpenChats([]);
          setMessage('Friends list could not be updated or is empty.');
        }
      } else {
        setFriends([]);
        setOpenChats([]);
        setMessage('Failed to fetch friends list.');
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setFriends([]);
      setMessage('An error occurred while fetching friends list.');
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchPendingRequests = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/friends?pending=true', { signal });
      const data = await res.json();
      console.log('fetchPendingRequests response:', data);
      if (res.ok) {
        if (Array.isArray(data)) {
          setPendingRequests(data);
        } else {
          setPendingRequests([]);
          setMessage('Pending requests could not be fetched.');
        }
      } else {
        setPendingRequests([]);
        setMessage('Pending requests could not be fetched.');
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setPendingRequests([]);
      setMessage('An error occurred while fetching pending requests.');
      console.error('Failed to fetch pending requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=users`);
      if (res.ok) {
        const data = await res.json();
        // Filter out current user and existing friends
        const filtered = data.filter((u: any) =>
          u.username !== session?.user?.name &&
          !friends.some(f => f.username === u.username)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (username: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`Friend request sent to ${username}!`);
        setSearchResults(prev => prev.filter(u => u.username !== username));
      } else {
        setMessage(data.error || 'Failed to send request');
      }
    } catch (error) {
      setMessage('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      console.log('acceptRequest response:', data);
      if (res.ok) {
        fetchFriends();
        fetchPendingRequests();
        setMessage(`You are now friends with ${username}!`);
      } else {
        setMessage(data.error || 'Friend request could not be accepted.');
      }
    } catch (error) {
      setMessage('An error occurred while accepting friend request.');
      console.error('Failed to accept request:', error);
    } finally {
      setLoading(false);
    }
  };

  const declineRequest = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      console.log('declineRequest response:', data);
      if (res.ok) {
        fetchPendingRequests();
        setMessage('Friend request was rejected.');
      } else {
        setMessage(data.error || 'Friend request could not be rejected.');
      }
    } catch (error) {
      setMessage('An error occurred while rejecting friend request.');
      console.error('Failed to decline request:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (username: string) => {
    if (!confirm(`Remove ${username} from friends?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        fetchFriends();
        // Remove chat window if open
        setOpenChats(prev => prev.filter(f => f.username !== username));
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (friend: Friend) => {
    setOpenChats(prev => {
      // If the window is already open, do not add again
      if (prev.some(f => f.id === friend.id)) return prev;
      return [...prev, friend];
    });
  };

  const handleCloseChat = (friendId: string) => {
    setOpenChats(prev => prev.filter(f => f.id !== friendId));
  };

  if (!session) return null;

  return (
    <DebugErrorBoundary debugContext={{ friends, pendingRequests, searchResults, openChats }}>
      <div className="relative">
        {/* Friends Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-lg border-2 transition-all hover:scale-105 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${isDarkMode
              ? 'border-white/30 bg-black/50 hover:bg-white/10'
              : 'border-black bg-white hover:bg-gray-100'
            }`}
        >
          <Users size={20} className={isDarkMode ? 'text-white' : 'text-black'} />
          {safePendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>

        {/* Panel */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/40 sm:bg-black/20" onClick={() => setIsOpen(false)} />

            {/* Mobile and Desktop: dropdown */}
            <div
              className={`
              absolute
              top-[120%] sm:top-12
              right-0
              w-[85vw] sm:w-80
              max-w-[340px] sm:max-w-none
              max-h-[85vh] sm:max-h-[70vh]
              overflow-hidden
              rounded-xl sm:rounded-lg
              border-2
              shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              z-[70]
              animate-fade-in sm:animate-none
              ${isDarkMode
                  ? 'border-white/30 bg-gray-900'
                  : 'border-black bg-white'
                }
            `}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-3 border-b-2 ${isDarkMode ? 'border-white/20' : 'border-black'}`}>
                <h3 className={`font-bold text-base sm:text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  👥 Friends
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 sm:p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                >
                  <X size={20} className={`sm:hidden ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  <X size={16} className={`hidden sm:block ${isDarkMode ? 'text-white' : 'text-black'}`} />
                </button>
              </div>

              {/* Tabs */}
              <div className={`flex border-b-2 ${isDarkMode ? 'border-white/20' : 'border-black'}`}>
                {(Array.isArray(['friends', 'requests', 'add']) ? (['friends', 'requests', 'add'] as const) : []).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 sm:py-2 text-sm sm:text-xs font-bold transition-colors ${activeTab === tab
                        ? (isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700')
                        : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black')
                      }`}
                  >
                    {tab === 'friends' && `Friends (${safeFriends.length})`}
                    {tab === 'requests' && `Requests (${safePendingRequests.length})`}
                    {tab === 'add' && 'Add Friend'}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div
                className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto p-3 sm:p-2 mobile-scroll"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              >
                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  safeFriends.length === 0 ? (
                    <div className={`p-8 sm:p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Users size={40} className="mx-auto mb-3 opacity-50 sm:w-8 sm:h-8" />
                      <p className="text-base sm:text-sm">No friends yet</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-3 sm:mt-2 text-sm sm:text-xs font-bold underline"
                        style={{ color: currentTheme.colors.primary }}
                      >
                        Add some friends!
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(Array.isArray(safeFriends) ? safeFriends : []).map(friend => (
                        <div
                          key={friend.id}
                          className={`flex items-center gap-3 p-3 sm:p-2 rounded-lg border transition-transform active:scale-[0.98] ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className="relative">
                            {friend.image ? (
                              <img src={friend.image} alt={friend.username} className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-xs border-2 border-black">
                                {friend.username[0].toUpperCase()}
                              </div>
                            )}
                            {friend.isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/profile/${friend.username}`}
                              className={`text-base sm:text-sm font-bold hover:underline truncate block ${friend.isFounder ? 'text-purple-400' : (friend.isVIP ? 'text-yellow-500' : (isDarkMode ? 'text-white' : 'text-black'))}`}
                              onClick={() => setIsOpen(false)}
                            >
                              {friend.isFounder && '\ud83d\udc51 '}
                              {friend.isVIP && !friend.isFounder && '\u2b50 '}
                              {friend.username}
                            </Link>
                            {friendPresence[friend.id] && (
                              <a
                                href={`/room/${friendPresence[friend.id]!.roomId}`}
                                className="text-xs text-green-500 font-semibold hover:underline block truncate"
                                onClick={() => setIsOpen(false)}
                              >
                                \ud83c\udfac Now Watching
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2 sm:gap-1">
                            <button
                              className="p-2.5 sm:p-1.5 rounded bg-purple-500 text-white hover:bg-purple-600 active:scale-95 transition-transform"
                              title="Message"
                              onClick={() => handleOpenChat(friend)}
                            >
                              <MessageCircle size={18} className="sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              onClick={() => removeFriend(friend.username)}
                              className="p-2.5 sm:p-1.5 rounded bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-transform"
                              title="Remove friend"
                            >
                              <UserMinus size={18} className="sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  safePendingRequests.length === 0 ? (
                    <div className={`p-8 sm:p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock size={40} className="mx-auto mb-3 opacity-50 sm:w-8 sm:h-8" />
                      <p className="text-base sm:text-sm">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(Array.isArray(safePendingRequests) ? safePendingRequests : []).map(request => (
                        <div
                          key={request.id}
                          className={`flex items-center gap-3 p-3 sm:p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'
                            }`}
                        >
                          {request.fromUser.image ? (
                            <img src={request.fromUser.image} alt={request.fromUser.username} className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-black" />
                          ) : (
                            <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm sm:text-xs border-2 border-black">
                              {request.fromUser.username[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={`text-base sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                              {request.fromUser.username}
                            </p>
                            <p className={`text-sm sm:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Wants to be friends
                            </p>
                          </div>
                          <div className="flex gap-2 sm:gap-1">
                            <button
                              onClick={() => acceptRequest(request.fromUser.username)}
                              disabled={loading}
                              className="p-2.5 sm:p-1.5 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 active:scale-95 transition-transform"
                            >
                              <Check size={18} className="sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              onClick={() => declineRequest(request.fromUser.username)}
                              disabled={loading}
                              className="p-2.5 sm:p-1.5 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 active:scale-95 transition-transform"
                            >
                              <X size={18} className="sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Add Friend Tab */}
                {activeTab === 'add' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                        placeholder="Search username..."
                        className={`flex-1 px-4 py-3 sm:px-3 sm:py-2 text-base sm:text-sm border-2 rounded-lg sm:rounded ${isDarkMode
                            ? 'border-white/30 bg-gray-800 text-white placeholder-gray-500'
                            : 'border-black bg-white text-black'
                          }`}
                      />
                      <button
                        onClick={searchUsers}
                        disabled={isSearching}
                        className="px-4 py-3 sm:px-3 sm:py-2 bg-purple-500 text-white rounded-lg sm:rounded font-bold hover:bg-purple-600 disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        <Search size={20} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {message && (
                      <p className={`text-sm sm:text-xs text-center ${message.includes('sent') ? 'text-green-500' : 'text-red-500'}`}>
                        {message}
                      </p>
                    )}

                    {searchQuery.trim() && !isSearching && safeSearchResults.length === 0 && (
                      <div className={`text-center py-6 sm:py-4 text-base sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No users found with that username.
                      </div>
                    )}

                    {safeSearchResults.length > 0 && (
                      <div className="space-y-2">
                        {(Array.isArray(safeSearchResults) ? safeSearchResults : []).map(user => (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-3 sm:p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'
                              }`}
                          >
                            <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm sm:text-xs border-2 border-black">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className={`text-base sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                {user.username}
                              </p>
                            </div>
                            <button
                              onClick={() => sendFriendRequest(user.username)}
                              disabled={loading}
                              className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-bold bg-blue-500 text-white rounded-lg sm:rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <UserPlus size={14} className="sm:w-3 sm:h-3" />
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Chat windows side by side at bottom right */}
            <div style={{ position: 'fixed', right: 0, bottom: 0, zIndex: 9999 }}>
              {(() => {
                const maxVisible = 4;
                const visibleChats = safeOpenChats.slice(-maxVisible);
                const extra = safeOpenChats.length - visibleChats.length;
                return (
                  <>
                    {(Array.isArray(visibleChats) ? visibleChats : []).map((friend, idx) => {
                      const globalIndex = safeOpenChats.length - visibleChats.length + idx;
                      const computedIndex = safeOpenChats.length - 1 - globalIndex; // latest chat should be right-most
                      return (
                        <ChatWindow
                          key={friend.id}
                          friend={friend}
                          onClose={() => handleCloseChat(friend.id)}
                          index={computedIndex}
                          width={350}
                          gap={16}
                        />
                      );
                    })}
                    {extra > 0 && (
                      <div style={{ position: 'fixed', right: 20 + visibleChats.length * (350 + 16), bottom: 20, zIndex: 100000 }}>
                        <button type="button" className="bg-gray-800 text-white rounded-full px-3 py-2" title="Additional conversations">
                          +{extra}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </DebugErrorBoundary>
  );
};

export const FriendsList = React.memo(FriendsListComponent);
export default FriendsList;
