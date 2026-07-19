'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Trophy, Clock, Users, MessageSquare, Tv, Award } from 'lucide-react';
import { StreakDisplay } from '@/components/engagement/StreakDisplay';
import { XPDisplay } from '@/components/engagement/XPDisplay';

interface Stats {
  watchTime: number;
  roomsJoined: number;
  messagesSent: number;
  roomsCreated: number;
  friends: number;
  badges: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  level: number;
}

function formatWatchTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function StatsWindow() {
  const { data: session, status } = useSession();
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchStats = async () => {
      try {
        const [statsRes, streakRes, xpRes] = await Promise.all([
          fetch('/api/achievements'),
          fetch('/api/user/streak'),
          fetch('/api/user/xp'),
        ]);
        const [statsData, streakData, xpData] = await Promise.all([
          statsRes.json(), streakRes.json(), xpRes.json(),
        ]);
        setStats({
          watchTime:    statsData.stats?.watchTime    || 0,
          roomsJoined:  statsData.stats?.roomsJoined  || 0,
          messagesSent: statsData.stats?.messagesSent || 0,
          roomsCreated: statsData.stats?.roomsCreated || 0,
          friends:      statsData.stats?.friends      || 0,
          badges:       statsData.achievements?.length || 0,
          currentStreak: streakData.currentStreak     || 0,
          longestStreak: streakData.longestStreak      || 0,
          totalXP:      xpData.totalXP                || 0,
          level:        xpData.level                  || 1,
        });
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [status]);

  if (!session || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-t-pink-500 border-pink-500/20 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: 'Watch Time',     value: formatWatchTime(stats.watchTime),      icon: <Clock       size={18} className="text-blue-500"   />, color: '#3b82f6' },
        { label: 'Rooms Joined',   value: String(stats.roomsJoined),             icon: <Tv          size={18} className="text-green-500"  />, color: '#10b981' },
        { label: 'Messages',       value: stats.messagesSent.toLocaleString(),   icon: <MessageSquare size={18} className="text-purple-500" />, color: '#a855f7' },
        { label: 'Rooms Created',  value: String(stats.roomsCreated),            icon: <Award       size={18} className="text-yellow-500" />, color: '#eab308' },
        { label: 'Friends',        value: String(stats.friends),                 icon: <Users       size={18} className="text-pink-500"   />, color: '#ec4899' },
        { label: 'Badges',         value: String(stats.badges),                  icon: <Trophy      size={18} className="text-orange-500" />, color: '#f97316' },
      ]
    : [];

  const border = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,1)';
  const shadow = isDarkMode ? '4px 4px 0 rgba(255,255,255,0.15)' : '4px 4px 0 rgba(0,0,0,1)';
  const cardBg = isDarkMode ? currentTheme.colors.darkBackground : 'white';

  return (
    <div className="p-3 flex flex-col gap-3 min-w-0">
      {/* Streak + XP compact row */}
      <div className="grid grid-cols-2 gap-3">
        <StreakDisplay />
        <XPDisplay />
      </div>

      {/* Stat grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(card => (
            <div
              key={card.label}
              className="border-4 p-3"
              style={{ borderColor: border, boxShadow: shadow, backgroundColor: cardBg }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {card.icon}
                <span className="font-black text-xs uppercase tracking-wide">{card.label}</span>
              </div>
              <div className="text-2xl font-black" style={{ color: currentTheme.colors.primary }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {!stats && (
        <div className="text-center py-8">
          <p className="text-xs font-mono text-gray-500">NO STATS AVAILABLE</p>
        </div>
      )}
    </div>
  );
}
