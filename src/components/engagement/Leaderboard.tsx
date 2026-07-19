'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crown, Medal, Trophy, Users, MessageSquare, Clock, Zap, Sprout, MonitorPlay, Film, Clapperboard, LucideProps } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Link from 'next/link';
import { getCineRank, CineRank } from '@/lib/cineRank';
import type { FC } from 'react';

const RANK_ICON_MAP: Record<string, FC<LucideProps>> = {
  Sprout, MonitorPlay, Film, Clapperboard, Zap, Trophy, Crown,
};

function RankIcon({ rank, size = 16 }: { rank: CineRank; size?: number }) {
  const Icon = RANK_ICON_MAP[rank.icon];
  return Icon ? <Icon size={size} style={{ color: rank.color }} /> : null;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  image: string | null;
  level: number;
  currentStreak: number;
  watchTime?: number;
  roomsCreated?: number;
  messagesSent?: number;
  totalXP?: number;
}

interface LeaderboardProps {
  type?: 'watchTime' | 'roomsCreated' | 'messagesSent' | 'streak' | 'level';
  limit?: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  watchTime: { label: 'Watch Time', color: '#3B82F6', icon: Clock },
  roomsCreated: { label: 'Rooms', color: '#10B981', icon: Users },
  messagesSent: { label: 'Messages', color: '#8B5CF6', icon: MessageSquare },
  streak: { label: 'Streak', color: '#F59E0B', icon: Zap },
  level: { label: 'Level', color: '#EC4899', icon: Trophy },
};

export function Leaderboard({ type = 'watchTime', limit = 10 }: LeaderboardProps) {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(type);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(selectedType, controller.signal);
    return () => controller.abort();
  }, [selectedType]);

  const fetchLeaderboard = async (boardType: string, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboards?type=${boardType}&limit=${limit}`, { signal });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (entry: LeaderboardEntry, t: string) => {
    switch (t) {
      case 'watchTime':
        const totalSeconds = entry.watchTime || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) {
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return minutes > 0 ? `${minutes}m` : '0m';
      case 'roomsCreated':
        return (entry.roomsCreated ?? 0).toString();
      case 'messagesSent':
        return (entry.messagesSent ?? 0).toString();
      case 'streak':
        return `${entry.currentStreak ?? 0}d`;
      case 'level':
        return `Lv.${entry.level ?? 0}`;
      default:
        return entry.totalXP?.toLocaleString() || '0';
    }
  };

  const getAvatarEmoji = (username: string) => {
    const emojis = ['🧢', '💧', '🪨', '🛡️', '🚀', '⚡', '🔥', '⭐', '🎮', '🎯'];
    return emojis[username.charCodeAt(0) % emojis.length];
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-xs font-mono text-center py-4 opacity-50">LOADING...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">LEADERBOARD</h2>
        </div>
        <div className="text-xs font-mono text-center py-4 text-gray-500">NO DATA</div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const config = TYPE_CONFIG[selectedType] || TYPE_CONFIG.watchTime;
  const TypeIcon = config.icon;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="p-4 grid grid-cols-1 gap-3 overflow-y-auto h-full content-start scrollbar-thin">
        <div className="mb-2 px-2 flex items-center justify-between">
          <h2 className="text-xl font-black italic opacity-50">LEADERBOARD</h2>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className={`text-xs font-mono border-2 ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white'} px-2 py-1 outline-none rounded`}
          >
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="flex items-end justify-center gap-2 mb-4 h-32">
            {/* 2nd Place */}
            {topThree[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 w-1/3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white shadow-lg flex items-center justify-center text-xl overflow-hidden">
                  {topThree[1].image ? (
                    <img src={topThree[1].image} alt={topThree[1].username} className="w-full h-full object-cover" />
                  ) : (
                    getAvatarEmoji(topThree[1].username)
                  )}
                </div>
                <div className="w-full bg-gray-300/20 h-20 rounded-t-lg border-x-2 border-t-2 border-gray-300/50 flex flex-col items-center justify-end p-2">
                  <span className="font-bold text-xs truncate w-full text-center">{topThree[1].username}</span>
                  <span className="font-mono text-[10px] opacity-70">2nd</span>
                  <span className="font-mono text-[10px] opacity-50">{formatValue(topThree[1], selectedType)}</span>
                </div>
              </motion.div>
            )}
            
            {/* 1st Place */}
            {topThree[0] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 w-1/3 z-10"
              >
                <Crown className="text-yellow-400 animate-bounce" size={24} />
                <div className="w-14 h-14 rounded-full bg-yellow-400 border-4 border-white shadow-[0_0_20px_gold] flex items-center justify-center text-2xl overflow-hidden">
                  {topThree[0].image ? (
                    <img src={topThree[0].image} alt={topThree[0].username} className="w-full h-full object-cover" />
                  ) : (
                    getAvatarEmoji(topThree[0].username)
                  )}
                </div>
                <div className="w-full bg-gradient-to-b from-yellow-400/20 to-transparent h-28 rounded-t-lg border-x-2 border-t-2 border-yellow-400/50 flex flex-col items-center justify-end p-2 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                  <span className="font-black text-sm truncate w-full text-center text-yellow-600 dark:text-yellow-400 relative z-10">{topThree[0].username}</span>
                  <span className="font-mono text-xs font-bold text-yellow-500 relative z-10">1st</span>
                  <span className="font-mono text-[10px] opacity-70 relative z-10">{formatValue(topThree[0], selectedType)}</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 w-1/3"
              >
                <div className="w-10 h-10 rounded-full bg-orange-300 border-2 border-white shadow-lg flex items-center justify-center text-xl overflow-hidden">
                  {topThree[2].image ? (
                    <img src={topThree[2].image} alt={topThree[2].username} className="w-full h-full object-cover" />
                  ) : (
                    getAvatarEmoji(topThree[2].username)
                  )}
                </div>
                <div className="w-full bg-orange-300/20 h-16 rounded-t-lg border-x-2 border-t-2 border-orange-300/50 flex flex-col items-center justify-end p-2">
                  <span className="font-bold text-xs truncate w-full text-center">{topThree[2].username}</span>
                  <span className="font-mono text-[10px] opacity-70">3rd</span>
                  <span className="font-mono text-[10px] opacity-50">{formatValue(topThree[2], selectedType)}</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* The Rest of the List */}
        {rest.map((user, index) => {
          const cineRank = selectedType === 'watchTime' ? getCineRank(user.watchTime ?? 0) : null;
          return (
          <Link
            key={user.id}
            href={`/profile/${user.username}`}
          >
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800 text-left w-full"
              style={{
                borderLeftColor: config.color,
                borderLeftWidth: '4px'
              }}
            >
              {/* Rank Badge */}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner font-black text-lg"
                style={{ backgroundColor: config.color }}
              >
                {user.rank}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-lg leading-none truncate group-hover:text-primary transition-colors"
                      style={{ color: currentTheme.colors.primary }}>
                    {user.username}
                  </h3>
                  {cineRank && (
                    <span className="shrink-0 flex items-center gap-1 opacity-75">
                      <RankIcon rank={cineRank} size={14} />
                      <span className="hidden sm:inline text-xs font-bold" style={{ color: cineRank.color }}>{cineRank.title}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    {user.image ? (
                      <img src={user.image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">{getAvatarEmoji(user.username)}</span>
                    )}
                  </div>
                  <p className="text-xs font-mono opacity-60 truncate">
                    {formatValue(user, selectedType)}
                  </p>
                </div>
              </div>

              {/* Chevron */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-black dark:border-l-white border-b-[6px] border-b-transparent" />
              </div>
            </motion.button>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
