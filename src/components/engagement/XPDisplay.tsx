'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Zap, ChevronUp, Trophy } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface XPData {
  totalXP: number;
  level: number;
  xpProgress: number;
  xpForNextLevel: number;
  xpNeeded: number;
  progressPercent: number;
}

export function XPDisplay() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelUpShake, setLevelUpShake] = useState(false);
  const [prevLevel, setPrevLevel] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchXP(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchXP = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/user/xp', { signal });
      if (res.ok) {
        const data = await res.json();
        setXpData(data);
        
        if (data.level > prevLevel && prevLevel > 0) {
          setLevelUpShake(true);
          setTimeout(() => setLevelUpShake(false), 1000);
        }
        setPrevLevel(data.level);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch XP:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !xpData) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">XP & LEVEL</h2>
        </div>
        <div className="text-xs font-mono text-center py-4 opacity-50">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full scrollbar-thin">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">XP & LEVEL</h2>
        </div>

        {/* Level Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: 5 }}
          className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800"
          style={{
            borderLeftColor: currentTheme.colors.primary,
            borderLeftWidth: '4px'
          }}
        >
          {/* Level Badge */}
          <motion.div 
            animate={levelUpShake ? { 
              scale: [1, 1.3, 1],
              rotate: [0, -10, 10, -10, 0]
            } : {}}
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl text-white shadow-inner"
            style={{ backgroundColor: currentTheme.colors.primary }}
          >
            {xpData.level}
          </motion.div>

          {/* Level Info */}
          <div className="flex-1">
            <h3 className="font-black text-lg leading-none mb-1 group-hover:text-primary transition-colors"
                style={{ color: currentTheme.colors.primary }}>
              LEVEL {xpData.level}
            </h3>
            <p className="text-xs font-mono opacity-60">
              {xpData.xpNeeded.toLocaleString()} XP to next level
            </p>
          </div>
        </motion.div>

        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, x: 5 }}
          className="group relative flex flex-col gap-3 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800"
          style={{
            borderLeftColor: currentTheme.colors.primary,
            borderLeftWidth: '4px'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Star size={20} className="text-yellow-500" />
            <h3 className="font-black text-lg leading-none group-hover:text-primary transition-colors"
                style={{ color: currentTheme.colors.primary }}>
              PROGRESS
            </h3>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(xpData.progressPercent, 100)}%` }}
              transition={{ type: "spring", damping: 20 }}
              className="h-full relative overflow-hidden"
              style={{ backgroundColor: currentTheme.colors.primary }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30" />
              <motion.div 
                animate={{ x: [-20, 0] }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="absolute inset-0 opacity-30"
                style={{ 
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
                  backgroundSize: '10px 10px' 
                }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-sm" />
            </motion.div>
          </div>
          
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="opacity-60">
              {xpData.xpProgress.toLocaleString()} / {xpData.xpForNextLevel.toLocaleString()}
            </span>
            <span className="font-bold opacity-80">
              {Math.round(xpData.progressPercent)}%
            </span>
          </div>
        </motion.div>

        {/* Total XP Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
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
            <Trophy size={24} />
          </div>

          {/* Total XP Info */}
          <div className="flex-1">
            <h3 className="font-black text-lg leading-none mb-1 group-hover:text-primary transition-colors"
                style={{ color: currentTheme.colors.primary }}>
              TOTAL XP
            </h3>
            <p className="text-xs font-mono opacity-60">
              {xpData.totalXP.toLocaleString()} XP
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
