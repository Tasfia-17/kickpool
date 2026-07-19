'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Trophy, DoorOpen, Timer, MessageCircle, Clapperboard, Star } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface Quest {
  id: string;
  questType: string;
  progress: number;
  target: number;
  completed: boolean;
  xpReward: number;
  title: string;
}

const QUEST_COLORS: Record<string, string> = {
  'join_room': '#3B82F6',
  'watch_time': '#10B981',
  'send_messages': '#8B5CF6',
  'create_room': '#F59E0B',
  'default': '#6B7280',
};

const QUEST_ICONS: Record<string, any> = {
  'join_room': DoorOpen,
  'watch_time': Timer,
  'send_messages': MessageCircle,
  'create_room': Clapperboard,
  'default': Star,
};

export function DailyQuests() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuests(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchQuests = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/quests/daily', { signal });
      if (res.ok) {
        const data = await res.json();
        setQuests(Array.isArray(data.quests) ? data.quests : []);
      } else {
        setQuests([]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = (id: string) => {
    // XP was already awarded server-side when the quest reached its target.
    // Just dismiss from the UI — on next fetch it'll be filtered out (completed: true).
    setQuests(prev => prev.filter(q => q.id !== id));
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-xs font-mono text-center py-4 opacity-50">LOADING...</div>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">DAILY QUESTS</h2>
        </div>
        <div className="text-xs font-mono text-center py-4 text-gray-500">NO QUESTS</div>
      </div>
    );
  }

  const activeQuests = quests.filter(q => !q.completed);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="p-4 grid grid-cols-1 gap-3 overflow-y-auto h-full content-start scrollbar-thin">
        <div className="mb-2 px-2">
          <h2 className="text-xl font-black italic opacity-50">DAILY QUESTS</h2>
        </div>

        {activeQuests.map((quest, index) => {
          const isComplete = quest.progress >= quest.target;
          const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
          const questColor = QUEST_COLORS[quest.questType] || QUEST_COLORS.default;
          const QuestIcon = QUEST_ICONS[quest.questType] || QUEST_ICONS.default;

          return (
            <motion.button
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => isComplete && handleClaim(quest.id)}
              disabled={!isComplete}
              className="group relative flex items-center gap-4 p-4 rounded-xl border-4 border-transparent hover:border-black dark:hover:border-white transition-all shadow-sm hover:shadow-xl bg-white dark:bg-gray-800 text-left disabled:cursor-default"
              style={{
                borderLeftColor: isComplete ? '#22c55e' : questColor,
                borderLeftWidth: '4px'
              }}
            >
              {/* Icon Box */}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner"
                style={{ backgroundColor: isComplete ? '#22c55e' : questColor }}
              >
                {isComplete ? <Trophy size={24} /> : <QuestIcon size={24} />}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-lg leading-none truncate group-hover:text-primary transition-colors"
                      style={{ color: currentTheme.colors.primary }}>
                    {quest.title}
                  </h3>
                  {isComplete && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-green-500 text-white shrink-0 ml-2">
                      CLAIM
                    </span>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mb-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className={`h-full ${isComplete ? 'bg-green-500' : questColor}`}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono opacity-60 truncate">
                    {quest.progress} / {quest.target}
                  </p>
                  <span className="text-xs font-mono font-bold opacity-80 shrink-0 ml-2">
                    {quest.xpReward} XP
                  </span>
                </div>
              </div>

              {/* Chevron */}
              {isComplete && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-black dark:border-l-white border-b-[6px] border-b-transparent" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
