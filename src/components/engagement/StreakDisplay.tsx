'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Clock } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
}

export function StreakDisplay() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextRewardTime, setNextRewardTime] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    fetchStreak(controller.signal);
    updateStreak(controller.signal);
    
    const calculateNextReward = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setNextRewardTime(`${hours}h ${minutes}m`);
    };
    
    calculateNextReward();
    const interval = setInterval(calculateNextReward, 60000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const fetchStreak = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/user/streak', { signal });
      if (res.ok) {
        const data = await res.json();
        setStreak(data);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/user/streak', { method: 'POST', signal });
      if (res.ok) {
        const data = await res.json();
        setStreak({
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          lastLoginDate: new Date().toISOString(),
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to update streak:', error);
    }
  };

  if (loading || !streak) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">LOGIN STREAK</h2>
        </div>
        <div className="text-xs font-mono text-center py-4 opacity-50">LOADING...</div>
      </div>
    );
  }

  const isFire = streak.currentStreak > 7;
  const flameColor = isFire ? '#60a5fa' : '#f97316';

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full scrollbar-thin">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">LOGIN STREAK</h2>
        </div>

        {/* Current Streak Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: 5 }}
          className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800 overflow-hidden"
          style={{
            borderLeftColor: flameColor,
            borderLeftWidth: '4px'
          }}
        >
          {/* Background Pulse */}
          <motion.div 
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 ${isFire ? 'bg-blue-500' : 'bg-orange-500'}`}
          />

          {/* Icon Box */}
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0 z-10">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`absolute inset-0 rounded-full blur-xl ${isFire ? 'bg-blue-500' : 'bg-orange-500'}`}
            />
            <motion.div
              animate={{ 
                scale: [1, 1.1, 0.9, 1],
                rotate: [-5, 5, -5] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame 
                size={32} 
                className={`drop-shadow-md ${isFire ? 'text-blue-400 fill-blue-500' : 'text-orange-500 fill-orange-500'}`} 
              />
            </motion.div>
          </div>

          {/* Streak Info */}
          <div className="flex-1 relative z-10">
            <h3 className="font-black text-lg leading-none mb-1 group-hover:text-primary transition-colors"
                style={{ color: currentTheme.colors.primary }}>
              {streak.currentStreak} DAYS
            </h3>
            <p className="text-xs font-mono opacity-60">
              Current streak
            </p>
          </div>

          {/* Number Display */}
          <div className="text-right relative z-10">
            <div className="text-4xl font-black font-mono leading-none" 
                  style={{ color: flameColor }}>
              {streak.currentStreak}
            </div>
          </div>
        </motion.div>

        {/* Longest Streak Card */}
        {streak.longestStreak > streak.currentStreak && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
            className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800"
            style={{
              borderLeftColor: '#FCD34D',
              borderLeftWidth: '4px'
            }}
          >
            {/* Icon */}
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner"
              style={{ backgroundColor: '#FCD34D' }}
            >
              <Flame size={24} />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-black text-lg leading-none mb-1 group-hover:text-primary transition-colors"
                  style={{ color: currentTheme.colors.primary }}>
                BEST STREAK
              </h3>
              <p className="text-xs font-mono opacity-60">
                {streak.longestStreak} days
              </p>
            </div>
          </motion.div>
        )}

        {/* Next Reward Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, x: 5 }}
          className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800"
          style={{
            borderLeftColor: '#8B5CF6',
            borderLeftWidth: '4px'
          }}
        >
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            <Clock size={24} />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-black text-lg leading-none mb-1 group-hover:text-primary transition-colors"
                style={{ color: currentTheme.colors.primary }}>
              NEXT REWARD
            </h3>
            <p className="text-xs font-mono opacity-60">
              {nextRewardTime}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
