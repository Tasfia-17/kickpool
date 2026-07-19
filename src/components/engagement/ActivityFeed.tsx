'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, MessageSquare, Terminal, Tv, UserPlus, Award } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Link from 'next/link';

interface Activity {
  id: string;
  type: string;
  data: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    image: string | null;
  };
}

export function ActivityFeed() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivities(controller.signal);
    // Poll for new activities every 30 seconds
    const interval = setInterval(() => fetchActivities(), 30000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const fetchActivities = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/activity?limit=50', { signal });
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data.activities) ? data.activities : []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityText = (activity: Activity) => {
    let data = null;
    try {
      data = activity.data ? JSON.parse(activity.data) : null;
    } catch {
      // Ignore parse errors
    }

    switch (activity.type) {
      case 'room_join':
        return `joined "${data?.roomName || 'a room'}"`;
      case 'room_create':
        return `created "${data?.roomName || 'a room'}"`;
      case 'badge_earn':
        return `earned "${data?.badgeTitle || 'a badge'}"`;
      case 'friend_add':
        return `added ${data?.friendName || 'a friend'}`;
      case 'message':
        return 'sent a message';
      case 'level_up':
        return `reached Level ${data?.level || '?'}`;
      default:
        return 'did something';
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

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">NET LOG</h2>
        </div>
        <div className="text-xs font-mono text-center py-4 opacity-50">LOADING LOG...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="p-4 flex flex-col gap-3 overflow-y-auto h-full scrollbar-thin">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">NET LOG</h2>
        </div>
        
        {/* Terminal Header */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-500/30 opacity-70">
          <Terminal size={14} className="text-green-400" />
          <span className="text-xs uppercase tracking-widest font-mono">NET_LOG_V1.4</span>
          <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono">LIVE</span>
        </div>

        {/* Logs Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin space-y-1 font-mono text-sm bg-black text-green-400 rounded-lg p-2"
          style={{
            scrollbarColor: '#10b981 transparent'
          }}
        >
        <AnimatePresence initial={false}>
          {activities.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-2 hover:bg-green-500/10 p-1 rounded transition-colors cursor-default group"
            >
              <span className="opacity-40 text-[10px] w-16 shrink-0 mt-0.5 font-mono">
                {formatTime(log.createdAt)}
              </span>
              <div className="break-words flex-1">
                <Link 
                  href={`/profile/${log.user.username}`}
                  className="font-bold text-green-300 hover:text-green-200 hover:underline"
                >
                  @{log.user.username}
                </Link>
                <span className="opacity-80"> {getActivityText(log)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
          {activities.length === 0 && (
            <div className="opacity-50 text-[10px] pt-4 text-center">-- NO ACTIVITY --</div>
          )}
          <div className="opacity-30 text-[10px] pt-4 text-center">-- END OF STREAM --</div>
        </div>
      </div>
    </div>
  );
}
