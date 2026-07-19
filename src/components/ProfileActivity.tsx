'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Clock, MessageCircle, Home, Gamepad2, 
  Trophy, Flame, TrendingUp, ChevronDown, ChevronUp,
  Lock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  icon: string;
  xpEarned: number;
  createdAt: string;
}

interface GameScore {
  gameType: string;
  score: number;
  playedAt: string;
}

interface WeekStats {
  watchTime: number;
  messagesCount: number;
  roomsJoined: number;
  gamesPlayed: number;
  xpEarned: number;
}

interface ProfileActivityProps {
  username: string;
  isDarkMode: boolean;
}

const gameNames: Record<string, string> = {
  snake: 'Ekans Run',
  clicker: 'Training Dummy',
  minesweeper: 'Voltorb Flip',
  reaction: 'Quick Draw',
  '2048': '2048 Evolution',
  tictactoe: 'Tic-Tac-Toe'
};

const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

export function ProfileActivity({ username, isDarkMode }: ProfileActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [recentScores, setRecentScores] = useState<GameScore[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [canViewFullActivity, setCanViewFullActivity] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/users/profile/${encodeURIComponent(username)}/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
          setRecentScores(data.recentScores || []);
          setCurrentStreak(data.currentStreak || 0);
          setWeekStats(data.weekStats || null);
          setCanViewFullActivity(data.canViewFullActivity);
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [username]);

  if (loading) {
    return (
      <div className={`border-4 p-4 rounded-lg animate-pulse ${
        isDarkMode ? 'border-pink-500/50 bg-black/50' : 'border-black bg-gray-50'
      }`}>
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`border-4 rounded-lg overflow-hidden ${
      isDarkMode ? 'border-pink-500/50 shadow-[4px_4px_0px_0px_rgba(236,72,153,0.3)]' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
    }`} style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'white' }}>
      
      {/* Header */}
      <div className={`p-4 border-b-4 ${isDarkMode ? 'border-pink-500/30' : 'border-black'}`}>
        <h3 className={`font-bold text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          <Activity size={20} className="text-pink-500" />
          Recent Activity
          {currentStreak > 0 && (
            <span className="ml-auto flex items-center gap-1 text-orange-500 text-sm">
              <Flame size={16} className="animate-pulse" />
              {currentStreak} day streak!
            </span>
          )}
        </h3>
      </div>

      {/* Week Stats */}
      {weekStats && (
        <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 border-b-2 ${
          isDarkMode ? 'border-pink-500/20 bg-pink-500/5' : 'border-black/10 bg-gray-50'
        }`}>
          <StatBadge 
            icon={<Clock size={14} />} 
            label="Watch Time" 
            value={`${Math.floor(weekStats.watchTime / 60)}m`}
            isDarkMode={isDarkMode}
          />
          <StatBadge 
            icon={<MessageCircle size={14} />} 
            label="Messages" 
            value={weekStats.messagesCount.toString()}
            isDarkMode={isDarkMode}
          />
          <StatBadge 
            icon={<Home size={14} />} 
            label="Rooms" 
            value={weekStats.roomsJoined.toString()}
            isDarkMode={isDarkMode}
          />
          <StatBadge 
            icon={<Gamepad2 size={14} />} 
            label="Games" 
            value={weekStats.gamesPlayed.toString()}
            isDarkMode={isDarkMode}
          />
          <StatBadge 
            icon={<TrendingUp size={14} />} 
            label="XP Earned" 
            value={`+${weekStats.xpEarned}`}
            isDarkMode={isDarkMode}
            highlight
          />
        </div>
      )}

      {/* Activity Feed */}
      <div className="p-3">
        {activities.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="sync">
              {activities.slice(0, expanded ? undefined : 5).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-2 rounded-lg mb-2 ${
                    isDarkMode ? 'hover:bg-pink-500/10' : 'hover:bg-pink-50'
                  } transition-colors`}
                >
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {activity.description}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                  {activity.xpEarned > 0 && (
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                      +{activity.xpEarned} XP
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {activities.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full py-2 text-sm font-bold flex items-center justify-center gap-1 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-pink-400 hover:bg-pink-500/10' 
                    : 'text-pink-600 hover:bg-pink-50'
                }`}
              >
                {expanded ? (
                  <>Show Less <ChevronUp size={16} /></>
                ) : (
                  <>Show More ({activities.length - 5} more) <ChevronDown size={16} /></>
                )}
              </button>
            )}

            {!canViewFullActivity && (
              <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg text-xs ${
                isDarkMode ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700'
              }`}>
                <Lock size={14} />
                <span>Become friends to see full activity</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Game Scores */}
      {recentScores.length > 0 && (
        <div className={`p-3 border-t-2 ${isDarkMode ? 'border-pink-500/20' : 'border-black/10'}`}>
          <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <Gamepad2 size={16} className="text-purple-500" />
            Recent Game Scores
          </h4>
          <div className="flex flex-wrap gap-2">
            {recentScores.map((score, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                  isDarkMode 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                <span className="font-bold">{gameNames[score.gameType] || score.gameType}</span>
                <span className="mx-1">·</span>
                <span className="text-yellow-500 font-bold">{score.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Badge Component
interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isDarkMode: boolean;
  highlight?: boolean;
}

function StatBadge({ icon, label, value, isDarkMode, highlight }: StatBadgeProps) {
  return (
    <div className={`text-center p-2 rounded-lg ${
      highlight 
        ? (isDarkMode ? 'bg-green-500/20' : 'bg-green-100')
        : (isDarkMode ? 'bg-white/5' : 'bg-white')
    }`}>
      <div className={`flex items-center justify-center gap-1 mb-1 ${
        highlight ? 'text-green-500' : (isDarkMode ? 'text-pink-400' : 'text-pink-600')
      }`}>
        {icon}
      </div>
      <p className={`text-sm font-black ${
        highlight ? 'text-green-500' : (isDarkMode ? 'text-white' : 'text-black')
      }`}>
        {value}
      </p>
      <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </p>
    </div>
  );
}
