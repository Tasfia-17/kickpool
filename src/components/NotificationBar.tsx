'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, UserPlus, MessageCircle, Check, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import { useToast } from '@/components/ui/Toast';
import { useSounds } from '@/hooks/useSounds';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'message' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: string | {
    fromUserId?: string;
    fromUsername?: string;
    roomId?: string;
  };
}

// Helper to parse notification data
const parseNotificationData = (data: Notification['data']): Record<string, any> => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
};

export const NotificationBar: React.FC = () => {
  const { data: session } = useSession();
  const { isDarkMode, currentTheme, pokemonSprite } = usePokemonTheme();
  const { addToast } = useToast();
  const { playMessageSound } = useSounds();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const userId = (session?.user as any)?.id;
  // Reuse the app-wide singleton socket — server emits notification:new
  // to the user's socket ID via userSockets map, no room join needed
  const { socket } = useGlobalSocket();

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  useEffect(() => {
    if (session) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds (fallback)
      const interval = setInterval(() => {
        if (!socket?.connected) {
          fetchNotifications();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Listen for real-time notification events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => {
        // Check if notification already exists
        if (Array.isArray(prev) && prev.some(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });

      // Show popup toast and play sound for message notifications
      if (notification.type === 'message') {
        // Play notification sound
        playMessageSound();

        // Show toast popup
        const notifData = parseNotificationData(notification.data);
        const senderName = notifData.fromUsername || 'Someone';
        addToast({
          type: 'info',
          title: 'New Message',
          message: `${senderName}: ${notification.message}`,
          duration: 5000,
        });
      }

      // Refresh to get latest count
      fetchNotifications();
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, playMessageSound, addToast]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        // API returns { notifications, unreadCount }, extract the array
        if (data && typeof data === 'object') {
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          } else if (Array.isArray(data)) {
            setNotifications(data);
          } else {
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]); // Set empty array on error
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      });
      setNotifications(prev =>
        Array.isArray(prev) ? prev.map(n => (n.id === id ? { ...n, read: true } : n)) : []
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleAcceptFriend = async (notificationId: string, fromUsername: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fromUsername, notificationId }),
      });

      if (res.ok) {
        // Remove the notification from state
        setNotifications(prev => Array.isArray(prev) ? prev.filter(n => n.id !== notificationId) : []);
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineFriend = async (notificationId: string, fromUsername: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fromUsername, notificationId }),
      });

      if (res.ok) {
        setNotifications(prev => Array.isArray(prev) ? prev.filter(n => n.id !== notificationId) : []);
      }
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(prev => Array.isArray(prev) ? prev.filter(n => n.id !== id) : []);
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={16} className="text-blue-500" />;
      case 'friend_accepted':
        return <Check size={16} className="text-green-500" />;
      case 'message':
        return <MessageCircle size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!session) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:p-2 rounded-lg border-2 transition-all hover:scale-105 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${isDarkMode
            ? 'border-white/30 bg-black/50 hover:bg-white/10'
            : 'border-black bg-white hover:bg-gray-100'
          }`}
        aria-label="Notifications"
      >
        {/* Use a real notification bell for the notifications button instead of the current pokemon sprite */}
        <Bell size={20} className={isDarkMode ? 'text-white' : 'text-black'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 sm:bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Notification Panel - Dropdown for both Mobile and Desktop */}
          <div
            className={`
              absolute
              top-[120%] sm:top-12
              right-0
              w-[85vw] sm:w-80
              max-w-[340px] sm:max-w-none
              max-h-[80vh] sm:max-h-[70vh]
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
            <div
              className={`flex items-center justify-between p-3 sm:p-3 border-b-2 ${isDarkMode ? 'border-white/20' : 'border-black'
                }`}
            >
              <h3 className={`font-bold text-base sm:text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                🔔 Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 sm:p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center`}
              >
                <X size={20} className={`sm:hidden ${isDarkMode ? 'text-white' : 'text-black'}`} />
                <X size={16} className={`hidden sm:block ${isDarkMode ? 'text-white' : 'text-black'}`} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[60vh] sm:max-h-[50vh] overflow-y-auto mobile-scroll">
              {!Array.isArray(notifications) || notifications.length === 0 ? (
                <div className={`p-8 sm:p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Bell size={40} className="mx-auto mb-3 opacity-50 sm:w-8 sm:h-8" />
                  <p className="text-base sm:text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const notifData = parseNotificationData(notification.data);
                  const handleNotificationClick = () => {
                    if (!notification.read) markAsRead(notification.id);
                    // Navigate to messages if it's a message notification
                    if (notification.type === 'message' && notifData.fromUserId) {
                      setIsOpen(false);
                      window.location.href = `/profile?tab=messages&user=${notifData.fromUserId}`;
                    }
                  };
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 sm:p-3 border-b last:border-b-0 transition-colors cursor-pointer ${notification.read
                          ? (isDarkMode ? 'bg-gray-900' : 'bg-white')
                          : (isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50')
                        } ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} active:scale-[0.99] transition-transform`}
                      onClick={handleNotificationClick}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-base sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm sm:text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>

                          {/* Friend request actions */}
                          {notification.type === 'friend_request' && notifData.fromUsername && (
                            <div className="flex gap-2 mt-3 sm:mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptFriend(notification.id, notifData.fromUsername!);
                                }}
                                disabled={loading}
                                className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-bold bg-green-500 text-white rounded-lg sm:rounded hover:bg-green-600 disabled:opacity-50 active:scale-95 transition-transform"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeclineFriend(notification.id, notifData.fromUsername!);
                                }}
                                disabled={loading}
                                className="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-bold bg-red-500 text-white rounded-lg sm:rounded hover:bg-red-600 disabled:opacity-50 active:scale-95 transition-transform"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <Clock size={12} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                            <span className={`text-sm sm:text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Clear button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className={`p-2 sm:p-1 rounded opacity-50 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center`}
                        >
                          <X size={16} className="text-red-500 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with safe area for iOS */}
            {Array.isArray(notifications) && notifications.length > 0 && (
              <div
                className={`p-3 sm:p-2 border-t-2 text-center ${isDarkMode ? 'border-white/20' : 'border-black'
                  }`}
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              >
                <Link
                  href="/settings"
                  className={`text-sm sm:text-xs font-bold hover:underline`}
                  style={{ color: currentTheme.colors.primary }}
                  onClick={() => setIsOpen(false)}
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBar;
