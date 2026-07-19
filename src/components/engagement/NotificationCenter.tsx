'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, MessageSquare, Heart, Gift } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: string | Record<string, unknown>;
}

// Helper to parse notification data
const parseNotificationData = (data: Notification['data']): Record<string, unknown> => {
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

export function NotificationCenter() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetchNotifications(controller.signal);
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => fetchNotifications(), 30000);
      return () => {
        clearInterval(interval);
        controller.abort();
      };
    }
  }, [session]);

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/notifications?limit=20', { signal });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => 
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: n.id, read: true }),
          })
        )
      );
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'gift':
      case 'reward':
      case 'crate':
        return <Gift size={12} />;
      case 'social':
      case 'like':
        return <Heart size={12} />;
      default:
        return <MessageSquare size={12} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'gift':
      case 'reward':
      case 'crate':
        return 'bg-purple-500';
      case 'social':
      case 'like':
        return 'bg-pink-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (!session) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 sm:bg-black/20"
              onClick={() => setIsOpen(false)} 
            />
            
            {/* The Communicator Panel - Mobile: bottom sheet, Desktop: dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                fixed sm:absolute
                inset-x-0 sm:inset-x-auto
                bottom-0 sm:bottom-auto sm:top-12
                sm:right-0
                w-full sm:w-80
                max-h-[80vh] sm:max-h-96
                z-[70]
                rounded-t-2xl sm:rounded-xl
                overflow-hidden
                shadow-[0_-8px_30px_rgba(0,0,0,0.3)] sm:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]
                border-t-2 sm:border border-white/20
                backdrop-blur-xl
                ${isDarkMode ? 'bg-gray-900/95 text-white' : 'bg-white/95 text-black'}
              `}
            >
              {/* Mobile drag indicator */}
              <div className="sm:hidden flex justify-center py-2">
                <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-black/20'}`} />
              </div>

              <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/5">
                <span className="font-bold text-xs uppercase tracking-widest opacity-70">Communicator</span>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="p-2 sm:p-1 rounded hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                >
                  <X size={18} className="sm:hidden" />
                  <X size={14} className="hidden sm:block" />
                </button>
              </div>

              <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto p-2 space-y-2 mobile-scroll">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono">LOADING...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-mono text-gray-500">NO NOTIFICATIONS</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const notifData = parseNotificationData(n.data);
                    const handleNotificationClick = () => {
                      if (!n.read) markAsRead(n.id);
                      // Navigate to messages if it's a message notification
                      if (n.type === 'message' && notifData.fromUserId) {
                        setIsOpen(false);
                        window.location.href = `/profile?tab=messages&user=${notifData.fromUserId}`;
                      }
                    };
                    return (
                      <div 
                        key={n.id}
                        onClick={handleNotificationClick}
                        className={`p-3 rounded-lg flex gap-3 items-start border border-transparent hover:border-white/20 active:scale-[0.98] transition-all cursor-pointer ${isDarkMode ? 'bg-white/5' : 'bg-black/5'} ${!n.read ? 'ring-1 ring-blue-500/50' : ''}`}
                      >
                        <div className={`p-2 rounded-full ${getNotificationColor(n.type)} text-white flex-shrink-0`}>
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-relaxed">{n.title || n.message}</p>
                          {n.title && n.message && (
                            <p className="text-[10px] opacity-70 mt-1">{n.message}</p>
                          )}
                          <p className="text-[10px] opacity-50 font-mono mt-1">{formatTime(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="p-2 border-t border-white/10 text-center">
                   <button 
                     onClick={markAllAsRead}
                     className="text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity"
                   >
                     MARK ALL READ
                   </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
