'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Trophy, Lock, Zap } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
}

// Icon mapping for challenges
const getChallengeIcon = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('sniper') || lower.includes('reaction') || lower.includes('quick')) return '⚡';
  if (lower.includes('social') || lower.includes('chat') || lower.includes('message')) return '💬';
  if (lower.includes('collect') || lower.includes('crate') || lower.includes('open')) return '📦';
  if (lower.includes('marathon') || lower.includes('streak') || lower.includes('login')) return '🔥';
  if (lower.includes('watch') || lower.includes('time')) return '📺';
  if (lower.includes('room') || lower.includes('create')) return '🏠';
  if (lower.includes('win') || lower.includes('game')) return '🎮';
  return '🎯';
};

export function Challenges() {
  const { isDarkMode } = usePokemonTheme();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchChallenges(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchChallenges = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/challenges', { signal });
      if (res.ok) {
        const data = await res.json();
        setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs font-mono text-center py-4">LOADING...</div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-xs font-mono text-center py-4 text-gray-500">NO CHALLENGES</div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {challenges.map((challenge) => {
        const isUnlocked = challenge.completed;
        const percent = Math.min(100, (challenge.progress / challenge.target) * 100);
        const icon = getChallengeIcon(challenge.title);

        return (
          <motion.div
            key={challenge.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`relative p-3 rounded-xl border-2 overflow-hidden flex flex-col gap-2 min-h-[120px]
              ${isUnlocked 
                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10' 
                : isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}
            `}
          >
            {/* Background Icon Watermark */}
            <div className="absolute -right-2 -bottom-4 text-6xl opacity-10 pointer-events-none grayscale">
              {icon}
            </div>

            <div className="flex justify-between items-start z-10">
              <div className={`p-2 rounded-lg text-xl ${isUnlocked ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-gray-500/20 grayscale'}`}>
                {icon}
              </div>
              {isUnlocked ? (
                <Trophy size={16} className="text-yellow-500" />
              ) : (
                <Lock size={16} className="opacity-30" />
              )}
            </div>

            <div className="z-10 mt-auto">
              <h4 className={`font-black text-sm leading-none mb-1 ${isUnlocked ? 'text-yellow-600 dark:text-yellow-400' : 'opacity-60'}`}>
                {challenge.title}
              </h4>
              <p className="text-[10px] opacity-60 font-mono leading-tight mb-2">
                {challenge.description}
              </p>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percent}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full ${isUnlocked ? 'bg-yellow-400' : 'bg-gray-400'}`}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9px] font-bold opacity-50 uppercase">
                <span>{challenge.progress}/{challenge.target}</span>
                <span>+{challenge.xpReward} XP</span>
              </div>
            </div>
            
            {/* Shine Effect for unlocked cards */}
            {isUnlocked && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
