'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import {
  Trophy, Lock, Users, MessageSquare, Clock, Film,
  Sparkles, Crown, Zap, BookOpen, ChevronRight,
  Home, PartyPopper, UserPlus, Star, MessageCircle,
  Eye, Tv, GraduationCap, Gem, Crown as CrownIcon,
  Moon, Sun, Palette, Gamepad2,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Types & data
// ────────────────────────────────────────────────────────────────────────────
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface Achievement {
  id: string;
  title: string;
  description: string;
  hint: string;
  icon: string;
  category: string;
  rarity: Rarity;
  xp: number;
  secret?: boolean;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  // Rooms
  { id: 'first-room',   title: 'Room Creator',    description: 'Create your first watch room',    hint: 'Create a room from the home page',            icon: '🏠', category: 'rooms',    rarity: 'common',    xp: 50  },
  { id: 'room-master',  title: 'Room Master',     description: 'Create 10 watch rooms',           hint: 'Keep hosting rooms',                          icon: '🏡', category: 'rooms',    rarity: 'rare',      xp: 200 },
  { id: 'party-host',   title: 'Party Host',      description: 'Host a room with 5+ viewers',     hint: 'Invite friends to fill your room',             icon: '🎉', category: 'rooms',    rarity: 'rare',      xp: 150 },
  // Social
  { id: 'first-friend',     title: 'First Friend',      description: 'Add your first friend',     hint: 'Visit a profile and send a friend request',   icon: '👋', category: 'social', rarity: 'common',    xp: 50  },
  { id: 'social-butterfly', title: 'Social Butterfly',  description: 'Have 10 friends',           hint: 'Keep adding friends',                         icon: '🦋', category: 'social', rarity: 'rare',      xp: 150 },
  { id: 'popular',          title: 'Popular',           description: 'Have 50 friends',           hint: 'Build a huge friends list',                   icon: '⭐', category: 'social', rarity: 'epic',      xp: 300 },
  // Chat
  { id: 'first-message', title: 'First Words',  description: 'Send your first chat message',    hint: 'Type something in a room chat',                 icon: '💬', category: 'chat', rarity: 'common', xp: 25  },
  { id: 'chatterbox',    title: 'Chatterbox',   description: 'Send 100 messages',               hint: 'Keep chatting in rooms',                        icon: '🗣️', category: 'chat', rarity: 'rare',   xp: 100 },
  { id: 'storyteller',   title: 'Storyteller',  description: 'Send 1,000 messages',             hint: 'Stay active in room chats',                     icon: '📖', category: 'chat', rarity: 'epic',   xp: 250 },
  // Watching
  { id: 'first-watch',    title: 'First Watch',     description: 'Watch at least 1 minute',      hint: 'Join a room and start watching',                icon: '👀', category: 'watching', rarity: 'common',    xp: 25  },
  { id: 'binge-watcher',  title: 'Binge Watcher',   description: 'Watch for 10 hours total',     hint: 'Keep watching together',                        icon: '🍿', category: 'watching', rarity: 'rare',      xp: 200 },
  { id: 'movie-marathon', title: 'Movie Marathon',  description: 'Watch for 100 hours total',    hint: 'Become a true binge-watcher',                   icon: '🏅', category: 'watching', rarity: 'legendary', xp: 500 },
  // Study
  { id: 'first-study',     title: 'Study Begins',    description: 'Log your first study hour',          hint: 'Open the study timer and log time',     icon: '📚', category: 'study', rarity: 'common', xp: 50  },
  { id: 'study-streak-7',  title: 'Study Streak',    description: 'Accumulate 168 study hours (7 days)', hint: 'Study consistently over 7 days',       icon: '📝', category: 'study', rarity: 'rare',   xp: 200 },
  { id: 'focused-scholar', title: 'Focused Scholar', description: 'Study for 100 hours total',          hint: 'Reach 100 hours in the study tracker',  icon: '🔬', category: 'study', rarity: 'epic',   xp: 400 },
  // XP
  { id: 'xp-1000',  title: 'Rising Star', description: 'Reach 1,000 total XP',  hint: 'Earn XP by joining rooms, chatting, and more', icon: '✨', category: 'xp', rarity: 'common', xp: 0 },
  { id: 'xp-10000', title: 'XP Legend',   description: 'Reach 10,000 total XP', hint: 'Keep earning XP across all activities',        icon: '💫', category: 'xp', rarity: 'epic',   xp: 0 },
  // Loyalty
  { id: 'veteran',   title: 'Veteran',   description: 'Member for 30 days',                   hint: 'Come back in 30 days',                            icon: '🏆', category: 'loyalty', rarity: 'rare',      xp: 200 },
  { id: 'dedicated', title: 'Dedicated', description: 'Member for 100 days',                  hint: 'Stay active for 100 days',                        icon: '💎', category: 'loyalty', rarity: 'epic',      xp: 400 },
  { id: 'og-member', title: 'OG Member', description: 'Joined during beta (before Jan 2026)', hint: 'You had to be there from the start',              icon: '👑', category: 'loyalty', rarity: 'legendary', xp: 300 },
  // Secret
  { id: 'konami',         title: 'Konami Master',  description: 'Found the secret Konami code',      hint: '↑ ↑ ↓ ↓ ← → ← → B A',                    icon: '🎮', category: 'secret', rarity: 'rare',   xp: 100, secret: true },
  { id: 'night-owl',      title: 'Night Owl',      description: 'Watched something after midnight',  hint: 'Watch a video between midnight and 4 AM',   icon: '🦉', category: 'secret', rarity: 'common', xp: 75,  secret: true },
  { id: 'early-bird',     title: 'Early Bird',     description: 'Watched something before 6 AM',    hint: 'Watch a video between 4 AM and 6 AM',       icon: '🦅', category: 'secret', rarity: 'common', xp: 75,  secret: true },
  { id: 'theme-explorer', title: 'Theme Explorer', description: 'Tried all available cat themes',   hint: 'Cycle through all themes in settings',      icon: '🎨', category: 'secret', rarity: 'rare',   xp: 100, secret: true },
];

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string; glow: string }> = {
  all:      { label: 'All',      icon: <Trophy size={14} />,       color: '#ec4899', glow: 'rgba(236,72,153,0.4)'  },
  rooms:    { label: 'Rooms',    icon: <Film size={14} />,         color: '#3b82f6', glow: 'rgba(59,130,246,0.4)'  },
  social:   { label: 'Social',   icon: <Users size={14} />,        color: '#f472b6', glow: 'rgba(244,114,182,0.4)' },
  chat:     { label: 'Chat',     icon: <MessageSquare size={14} />,color: '#10b981', glow: 'rgba(16,185,129,0.4)'  },
  watching: { label: 'Watching', icon: <Clock size={14} />,        color: '#f59e0b', glow: 'rgba(245,158,11,0.4)'  },
  study:    { label: 'Study',    icon: <BookOpen size={14} />,     color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)'  },
  xp:       { label: 'XP',       icon: <Zap size={14} />,          color: '#eab308', glow: 'rgba(234,179,8,0.4)'   },
  loyalty:  { label: 'Loyalty',  icon: <Crown size={14} />,        color: '#ef4444', glow: 'rgba(239,68,68,0.4)'   },
  secret:   { label: 'Secret',   icon: <Sparkles size={14} />,     color: '#a855f7', glow: 'rgba(168,85,247,0.4)'  },
};

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Common',    color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  rare:      { label: 'Rare',      color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
  epic:      { label: 'Epic',      color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  legendary: { label: 'Legendary', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  },
};

function fmtTime(seconds: number) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ────────────────────────────────────────────────────────────────────────────
// Achievement card
// ────────────────────────────────────────────────────────────────────────────
function AchievementCard({
  achievement,
  isUnlocked,
  progress,
  isDarkMode,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: { progress: number; max: number };
  isDarkMode: boolean;
}) {
  const cat  = CATEGORIES[achievement.category] ?? CATEGORIES.all;
  const rar  = RARITY_CONFIG[achievement.rarity];
  const pct  = progress ? Math.round((progress.progress / progress.max) * 100) : 0;
  const isSecret = achievement.secret && !isUnlocked;

  // Map achievement icons to Lucide components
  const getIcon = () => {
    const iconMap: Record<string, React.ReactNode> = {
      '🏠': <Home size={20} />,
      '🏡': <Home size={20} />,
      '🎉': <PartyPopper size={20} />,
      '👋': <UserPlus size={20} />,
      '🦋': <Sparkles size={20} />,
      '⭐': <Star size={20} />,
      '💬': <MessageCircle size={20} />,
      '🗣️': <MessageCircle size={20} />,
      '📖': <BookOpen size={20} />,
      '👀': <Eye size={20} />,
      '🍿': <Tv size={20} />,
      '🏅': <Tv size={20} />,
      '📚': <GraduationCap size={20} />,
      '📝': <BookOpen size={20} />,
      '🔬': <GraduationCap size={20} />,
      '✨': <Sparkles size={20} />,
      '💫': <Sparkles size={20} />,
      '🏆': <Trophy size={20} />,
      '💎': <Gem size={20} />,
      '👑': <CrownIcon size={20} />,
      '🎮': <Gamepad2 size={20} />,
      '🦉': <Moon size={20} />,
      '🦅': <Sun size={20} />,
      '🎨': <Palette size={20} />,
    };
    return iconMap[achievement.icon] || <Star size={20} />;
  };

  return (
    <div
      className="relative flex flex-col border-2 overflow-hidden transition-all duration-200"
      style={{
        borderColor:     isUnlocked ? cat.color : (isDarkMode ? '#374151' : '#d1d5db'),
        backgroundColor: isUnlocked ? (isDarkMode ? '#0f0f1a' : '#fff') : (isDarkMode ? '#111827' : '#f9fafb'),
        boxShadow:       isUnlocked ? `0 0 12px ${cat.glow}, 3px 3px 0 ${cat.color}` : (isDarkMode ? '2px 2px 0 #1f2937' : '2px 2px 0 #e5e7eb'),
        filter:          !isUnlocked ? 'grayscale(0.3)' : 'none',
      }}
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: isUnlocked ? cat.color : (isDarkMode ? '#374151' : '#e5e7eb') }} />
      <div className="p-3 flex gap-2 flex-1">
        {/* Icon */}
        <div
          className="w-12 h-12 shrink-0 flex items-center justify-center border-2"
          style={{
            borderColor:     isUnlocked ? cat.color : (isDarkMode ? '#374151' : '#d1d5db'),
            backgroundColor: isUnlocked ? `${cat.color}22` : (isDarkMode ? '#1f2937' : '#e5e7eb'),
          }}
        >
          {isSecret ? (
            <Lock size={20} className="text-purple-400 opacity-70" />
          ) : isUnlocked ? (
            <span style={{ color: cat.color }}>{getIcon()}</span>
          ) : (
            <Lock size={18} style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }} />
          )}
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`font-bold text-sm truncate ${isUnlocked ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
              {achievement.title}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 shrink-0" style={{ color: rar.color, backgroundColor: rar.bg }}>
              {rar.label}
            </span>
            {achievement.xp > 0 && (
              <span className="text-[10px] font-mono shrink-0" style={{ color: isUnlocked ? '#fbbf24' : '#6b7280' }}>
                +{achievement.xp}xp
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed ${isUnlocked ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
            {isSecret ? '???' : isUnlocked ? achievement.description : achievement.hint}
          </p>
          {!isUnlocked && progress && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-1" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                <span>{fmtNum(progress.progress)} / {fmtNum(progress.max)}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 border overflow-hidden" style={{ borderColor: '#374151', backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color, opacity: 0.7 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────
interface AchievementsData {
  achievements: string[];
  progress: Record<string, { progress: number; max: number }>;
  stats: {
    watchTime: number;
    roomsJoined: number;
    roomsCreated: number;
    messagesSent: number;
    friends: number;
    totalXP: number;
    studyStreak: number;
  };
}

export function AchievementsWindow() {
  const { data: session, status } = useSession();
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/achievements')
      .then(r => r.json())
      .then((d: AchievementsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  if (!session || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-t-pink-500 border-pink-500/20 rounded-full animate-spin" />
      </div>
    );
  }

  const unlocked      = new Set(data?.achievements ?? []);
  const progressMap   = data?.progress ?? {};
  const stats         = data?.stats;
  const total         = ALL_ACHIEVEMENTS.length;
  const unlockedCount = ALL_ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length;
  const overallPct    = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const filtered = activeTab === 'all'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter(a => a.category === activeTab);

  const sortedFiltered = [...filtered].sort((a, b) => {
    const aU = unlocked.has(a.id) ? 1 : 0;
    const bU = unlocked.has(b.id) ? 1 : 0;
    if (aU !== bU) return bU - aU;
    const order: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
    return order.indexOf(a.rarity) - order.indexOf(b.rarity);
  });

  const border    = isDarkMode ? '#1f2937' : '#e5e7eb';
  const textMuted = isDarkMode ? '#6b7280' : '#9ca3af';

  return (
    <div className="flex flex-col gap-3 p-3 min-w-0">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 border overflow-hidden" style={{ borderColor: border, backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${overallPct}%`, backgroundColor: currentTheme.colors.primary }}
          />
        </div>
        <span className="text-sm font-black font-mono shrink-0" style={{ color: currentTheme.colors.primary }}>
          {unlockedCount}/{total} · {overallPct}%
        </span>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-6 gap-1">
          {[
            { label: 'Watch',    value: fmtTime(stats.watchTime),    color: '#f59e0b', icon: <Tv size={14} /> },
            { label: 'Rooms',    value: String(stats.roomsJoined),   color: '#3b82f6', icon: <Home size={14} /> },
            { label: 'Msgs',     value: fmtNum(stats.messagesSent),  color: '#10b981', icon: <MessageCircle size={14} /> },
            { label: 'Friends',  value: String(stats.friends),       color: '#ec4899', icon: <Users size={14} /> },
            { label: 'XP',       value: fmtNum(stats.totalXP),      color: '#fbbf24', icon: <Zap size={14} /> },
            { label: 'Study',    value: `${stats.studyStreak}h`,     color: '#8b5cf6', icon: <BookOpen size={14} /> },
          ].map(s => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-0.5 p-2 border text-center"
              style={{ backgroundColor: isDarkMode ? '#0f0f1a' : '#fff', borderColor: border }}
            >
              <span className="leading-none" style={{ color: s.color }}>{s.icon}</span>
              <span className="text-xs font-black font-mono" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] font-mono" style={{ color: textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const catItems    = key === 'all' ? ALL_ACHIEVEMENTS : ALL_ACHIEVEMENTS.filter(a => a.category === key);
          const catUnlocked = catItems.filter(a => unlocked.has(a.id)).length;
          const isActive    = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border-2 transition-all duration-150 select-none"
              style={{
                backgroundColor: isActive ? cat.color       : (isDarkMode ? '#0f0f1a' : '#fff'),
                borderColor:     isActive ? cat.color       : border,
                color:           isActive ? '#fff'          : (isDarkMode ? '#9ca3af' : '#6b7280'),
                boxShadow:       isActive ? `2px 2px 0 ${cat.glow}` : 'none',
              }}
            >
              {cat.icon}
              {cat.label}
              <span
                className="text-[9px] px-1 font-mono"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (isDarkMode ? '#1f2937' : '#f3f4f6'),
                  color:           isActive ? '#fff' : textMuted,
                }}
              >
                {catUnlocked}/{catItems.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sortedFiltered.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isUnlocked={unlocked.has(achievement.id)}
            progress={!unlocked.has(achievement.id) ? progressMap[achievement.id] : undefined}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      {sortedFiltered.length === 0 && (
        <div className="text-center py-8">
          <Sparkles size={32} className="mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
          <p style={{ color: textMuted }} className="font-mono text-xs">No achievements in this category yet.</p>
        </div>
      )}

      {/* Footer tip */}
      <div
        className="text-center p-2 border border-dashed"
        style={{ borderColor: isDarkMode ? '#374151' : '#d1d5db' }}
      >
        <p style={{ color: textMuted }} className="text-[10px] font-mono flex items-center justify-center gap-1">
          <Sparkles size={12} />
          Secret achievements are hidden until earned. Keep exploring!
          <ChevronRight size={12} />
        </p>
      </div>
    </div>
  );
}
