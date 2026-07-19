'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { POKEMON_THEMES } from '@/lib/pokemonThemes';
import { getPokeSprite } from '@/lib/catThemes';
import { useI18n } from '@/lib/i18n';
import { isAdminUser } from '@/lib/security';
import { useToast } from '@/components/ui/Toast';
import {
  Plus, ArrowRight, Play,
  Moon, Sun, Languages, User, LogOut, X,
  Shield, Zap, Grid3X3,
  BookOpen, Trophy, Gamepad2, Gift, Target,
  Activity, Info, Lock, Flame,
  Bot, Cat, PartyPopper, Medal, History, Bookmark
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import { ServerBrowser } from '@/components/home/ServerBrowser';
import { CreateRoomForm } from '@/components/home/CreateRoomForm';
import { FilmNewsWidget } from '@/components/home/FilmNewsWidget';

const VirtualPet = dynamic(() => import('@/components/VirtualPet'), { ssr: false });
const AIChatbot = dynamic(() => import('@/components/AIChatbot'), { ssr: false });
const NotificationBar = dynamic(() => import('@/components/NotificationBar'), { ssr: false });
const FriendsList = dynamic(() => import('@/components/FriendsList'), { ssr: false });
const AboutWindow = dynamic(() => import('@/components/windows/AboutWindow').then(m => ({ default: m.AboutWindow })), { ssr: false });
const PrivacyWindow = dynamic(() => import('@/components/windows/PrivacyWindow').then(m => ({ default: m.PrivacyWindow })), { ssr: false });

interface Room {
  id: string;
  name: string | null;
  currentVideoTitle: string;
  onlineCount: number;
  maxUsers: number;
  _count: { messages: number };
}

interface MobileHomeProps {
  publicRooms: Room[];
  joinCode: string;
  setJoinCode: (code: string) => void;
  onCreateRoom: () => void;
  onJoinCode: (e: React.FormEvent) => void;
  isCreating: boolean;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  onOpenWindow: (windowName: string) => void;
  unlockedThemes: string[];
  onSubmitRoom: (e: React.FormEvent) => void;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  maxUsers: number;
  setMaxUsers: (v: number) => void;
  isPublicRoom: boolean;
  setIsPublicRoom: (v: boolean) => void;
  partyMode: boolean;
}

const FEATURE_ITEMS = [
  { id: 'xp', icon: Zap, labelKey: 'xpLevel', descKey: 'trackProgress', window: 'xp' },
  { id: 'streak', icon: Flame, labelKey: 'loginStreak', descKey: 'dailyRewards', window: 'streak' },
  { id: 'quests', icon: Target, labelKey: 'dailyQuests', descKey: 'completeChallenges', window: 'quests' },
  { id: 'crates', icon: Gift, labelKey: 'crates', descKey: 'openLootCrates', window: 'crates' },
  { id: 'minigames', icon: Gamepad2, labelKey: 'minigames', descKey: 'playEarnXp', window: 'minigames' },
  { id: 'achievements', icon: Medal, labelKey: 'achievements', descKey: 'viewBadgesTrophies', window: 'achievements' },
  { id: 'leaderboard', icon: Trophy, labelKey: 'leaderboard', descKey: 'topPlayers', window: 'leaderboard' },
  { id: 'activity', icon: Activity, labelKey: 'activityFeed', descKey: 'recentEvents', window: 'activity' },
  { id: 'history', icon: History, labelKey: 'watchHistory', descKey: 'viewWatchHistory', window: 'history' },
  { id: 'watchlist', icon: Bookmark, labelKey: 'myWatchlist', descKey: 'trackWantToWatch', window: 'watchlist' },
  { id: 'study', icon: BookOpen, labelKey: 'studyRoom', descKey: 'focusPomodoro', href: '/study' },
] as const;

const EXCLUSIVE_THEMES = ['umbreon', 'flareon', 'gengar', 'sylveon'];

export function MobileHome({
  publicRooms,
  joinCode,
  setJoinCode,
  onCreateRoom,
  onJoinCode,
  isCreating,
  showCreateForm,
  setShowCreateForm,
  onOpenWindow,
  unlockedThemes,
  onSubmitRoom,
  newRoomName,
  setNewRoomName,
  maxUsers,
  setMaxUsers,
  isPublicRoom,
  setIsPublicRoom,
  partyMode,
}: MobileHomeProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { currentTheme, setTheme, pokemonSprite, isDarkMode, toggleDarkMode } = usePokemonTheme();
  const { language, setLanguage, t } = useI18n();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'home' | 'features' | 'more'>('home');
  const [showMobilePet, setShowMobilePet] = useState(false);
  const [showMobileAI, setShowMobileAI] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);

  const pc = currentTheme.colors.primary;
  const darkBg = currentTheme.colors.darkBackground;
  const warmBorder = isDarkMode ? 'rgba(255,255,255,0.12)' : '#e0d5c1';
  const warmCardBg = isDarkMode ? darkBg : '#ffffff';
  const warmPageBg = isDarkMode ? '#121212' : '#faf6ee';

  // Ensure active-tab text has enough contrast on white by darkening light primary colors
  const contrastColor = useMemo(() => {
    const hex = pc.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Relative luminance (WCAG formula simplified)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (isDarkMode) return pc; // dark bg → light text is fine
    if (lum < 0.6) return pc; // already dark enough
    // Darken by 35%
    return `#${Math.round(r * 0.65).toString(16).padStart(2, '0')}${Math.round(g * 0.65).toString(16).padStart(2, '0')}${Math.round(b * 0.65).toString(16).padStart(2, '0')}`;
  }, [pc, isDarkMode]);

  return (
    <LazyMotion features={domAnimation}>
    <div
      className="sm:hidden flex flex-col min-h-[100dvh] relative z-10 text-black dark:text-white"
      style={{ backgroundColor: isDarkMode ? 'transparent' : currentTheme.colors.background }}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="graph-paper-bg-subtle text-current h-full w-full" />
        <div className="crt-scanlines-subtle h-full w-full" />
      </div>

      {/* Navbar */}
      <nav
        className="h-14 flex items-center justify-between px-3 shrink-0 z-50 sticky top-0 border-b-4 border-black dark:border-white shadow-sm"
        style={{
          backgroundColor: isDarkMode ? darkBg : 'white',
          borderTopWidth: '3px',
          borderTopColor: pc,
        }}
      >
        <Logo size="sm" />
        <div className="flex items-center gap-1.5">
          {user && <NotificationBar />}
          {user && <FriendsList />}
          {user ? (
            <Link href={`/profile/${user.name}`} className="ml-1">
              <div className="w-8 h-8 border-2 border-black dark:border-white overflow-hidden bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                {user.name ? (
                  <Image
                    src={`/api/avatar/${encodeURIComponent(user.name)}`}
                    alt={`${user.name}'s avatar`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: pc }}>?</div>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex gap-1.5 ml-2">
              <Link
                href="/login"
                className="border-2 border-black dark:border-white active:opacity-70 transition-all flex items-center justify-center leading-none"
                style={{ fontSize: '10px', fontWeight: 700, width: '44px', height: '36px' }}
              >
                {t('login').toUpperCase()}
              </Link>
              <Link
                href="/register"
                className="border-2 border-black dark:border-white text-black active:opacity-70 transition-all flex items-center justify-center leading-none"
                style={{ backgroundColor: pc, fontSize: '10px', fontWeight: 700, width: '44px', height: '36px' }}
              >
                {t('register').toUpperCase()}
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-[72px] relative z-10">
        <AnimatePresence mode="popLayout">

          {/* ════════════════════ HOME TAB ════════════════════ */}
          {activeTab === 'home' && (
            <m.div
              key="home-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="p-3 space-y-4"
              // Improve mobile performance
              style={{ transform: 'translateZ(0)', willChange: 'opacity' }}
            >
              {/* CINEPURR_PLAYER.EXE Window */}
              <div
                className="border-4 border-black dark:border-white flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] relative overflow-hidden"
                style={{ backgroundColor: isDarkMode ? darkBg : 'white' }}
              >
                {/* Window Header */}
                <div
                  className="text-white p-2 flex justify-between items-center border-b-4 border-black dark:border-white shrink-0"
                  style={{ background: `linear-gradient(135deg, #111 0%, ${pc}44 100%)` }}
                >
                  <span className="font-mono font-bold flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: pc }} />
                    CINEPURR_PLAYER.EXE
                  </span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-white border border-gray-500" />
                    <div className="w-3 h-3 bg-white border border-gray-500" />
                    <div className="w-3 h-3 bg-[#ff5555] border border-gray-500" />
                  </div>
                </div>

                {/* Window Content */}
                <div
                  className={`flex-1 p-4 flex flex-col relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden transition-all duration-500 ${showCreateForm ? 'backdrop-blur-sm' : ''}`}
                >
                  {showCreateForm && (
                    <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md z-0 animate-fade-in-scale" />
                  )}

                  {/* Pokemon Mascot */}
                  <div className={`absolute top-2 right-2 z-0 transition-all duration-700 transform ${showCreateForm ? 'opacity-30 blur-sm scale-75' : 'opacity-100 scale-100'} ${partyMode ? 'animate-spin-slow' : ''}`}>
                    <Image
                      src={pokemonSprite}
                      alt={currentTheme.name}
                      width={112}
                      height={112}
                      priority
                      className="w-28 h-28 block object-contain drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] dark:drop-shadow-[4px_4px_0_rgba(255,255,255,0.2)] animate-bounce-subtle"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  {!showCreateForm ? (
                    <>
                      <div className="z-10 mt-2">
                        <h1
                          className={`text-6xl font-black drop-shadow-[2px_2px_0_#000] dark:drop-shadow-[2px_2px_0_#fff] leading-none mb-2 tracking-tighter ${partyMode ? 'animate-rainbow-text' : ''}`}
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${pc} 0%, ${currentTheme.colors.secondary || pc} 50%, ${pc} 100%)`,
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          WATCH<br />TOGETHER
                        </h1>
                        <div className="inline-block bg-black dark:bg-white text-white dark:text-black px-2 py-1 font-bold text-xs transform -rotate-1 border-2 border-white dark:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                          {partyMode ? (
                            <>
                              <PartyPopper size={14} className="inline" /> Party time! <PartyPopper size={14} className="inline" />
                            </>
                          ) : (
                            'No lag. Just vibes. :3'
                          )}
                        </div>
                      </div>

                      <div className="mt-6 z-10 space-y-2">
                        <button
                          type="button"
                          onClick={onCreateRoom}
                          disabled={isCreating}
                          className="w-full text-black font-black border-2 border-black dark:border-white p-3 text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 flex items-center justify-center gap-2"
                          style={{ backgroundColor: pc }}
                        >
                          <Plus size={18} strokeWidth={3} />
                          <span>{isCreating ? t('loading') : t('createRoom')}</span>
                        </button>

                        <form
                          onSubmit={onJoinCode}
                          className="flex shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                        >
                          <input
                            type="text"
                            placeholder={t('enterCode')}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="flex-1 border-2 border-black dark:border-white border-r-0 p-2 font-mono font-bold text-sm outline-none dark:bg-gray-800 dark:text-white min-w-0"
                          />
                          <button
                            type="submit"
                            className="bg-black dark:bg-white text-white dark:text-black px-4 font-bold text-sm border-2 border-black dark:border-white border-l-0 transition-all duration-200"
                          >
                            {t('joinRoom')}
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <CreateRoomForm
                      onSubmit={onSubmitRoom}
                      onClose={() => setShowCreateForm(false)}
                      newRoomName={newRoomName}
                      setNewRoomName={setNewRoomName}
                      maxUsers={maxUsers}
                      setMaxUsers={setMaxUsers}
                      isPublicRoom={isPublicRoom}
                      setIsPublicRoom={setIsPublicRoom}
                      isCreating={isCreating}
                      primaryColor={pc}
                      t={t}
                    />
                  )}
                </div>

              </div>

              {/* Server Browser */}
              <ServerBrowser
                publicRooms={publicRooms}
                primaryColor={pc}
                darkBackground={darkBg}
                isDarkMode={isDarkMode}
                isLoaded={true}
                t={t}
              />

              {/* Film News Widget */}
              <FilmNewsWidget />

              {/* Study Room */}
              {user && (
                <Link
                  href="/study"
                  className="block border-4 border-black dark:border-white p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  style={{ backgroundColor: isDarkMode ? darkBg : 'white' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-sm border-2 border-black dark:border-white flex items-center justify-center"
                      style={{ backgroundColor: `${pc}20` }}
                    >
                      <BookOpen size={18} style={{ color: pc }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">{t('studyRoom')}</h3>
                      <p className="font-mono text-xs opacity-50">{t('focusModePomodoro')}</p>
                    </div>
                    <ArrowRight size={14} className="opacity-40" />
                  </div>
                </Link>
              )}
            </m.div>
          )}

          {/* ════════════════════ FEATURES TAB ════════════════════ */}
          {activeTab === 'features' && (
            <m.div
              key="features-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="p-4 space-y-5"
              // Improve mobile performance
              style={{ transform: 'translateZ(0)', willChange: 'opacity' }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: pc }} />
                <h2 className="font-black text-lg uppercase tracking-wider">{t('features')}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {FEATURE_ITEMS.map((item) => {
                  const Icon = item.icon;

                  if ('href' in item && item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="rounded-2xl p-4 flex flex-col items-center text-center transition-all active:scale-95"
                        style={{
                          backgroundColor: warmCardBg,
                          border: `2px solid ${warmBorder}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${pc}15` }}
                        >
                          <Icon size={22} style={{ color: pc }} />
                        </div>
                        <span className="font-bold text-sm">{t(item.labelKey)}</span>
                        <span className="text-xs opacity-50 mt-0.5">{t(item.descKey)}</span>
                      </Link>
                    );
                  }

                  const windowName = 'window' in item ? item.window : '';
                  return (
                    <button
                      key={item.id}
                      onClick={() => onOpenWindow(windowName)}
                      className="rounded-2xl p-4 flex flex-col items-center text-center transition-all active:scale-95"
                      style={{
                        backgroundColor: warmCardBg,
                        border: `2px solid ${warmBorder}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                        style={{ backgroundColor: `${pc}15` }}
                      >
                        <Icon size={22} style={{ color: pc }} />
                      </div>
                      <span className="font-bold text-sm">{t(item.labelKey)}</span>
                      <span className="text-xs opacity-50 mt-0.5">{t(item.descKey)}</span>
                    </button>
                  );
                })}
              </div>


            </m.div>
          )}

          {/* ════════════════════ MORE TAB ════════════════════ */}
          {activeTab === 'more' && (
            <m.div
              key="more-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="p-4 space-y-4"
              // Improve mobile performance
              style={{ transform: 'translateZ(0)', willChange: 'opacity' }}
            >
              {/* User Profile Card */}
              {user && (
                <Link
                  href={`/profile/${user.name}`}
                  className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: warmCardBg,
                    border: `2px solid ${warmBorder}`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div
                    className="px-4 py-2 flex items-center gap-2 text-sm font-bold opacity-60"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9f4eb',
                      borderBottom: `1px solid ${warmBorder}`,
                    }}
                  >
                    <User size={13} />
                    <span className="uppercase tracking-widest text-xs">{t('profile')}</span>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl border-2 overflow-hidden flex-shrink-0"
                      style={{ borderColor: warmBorder, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                    >
                      <Image
                        src={`/api/avatar/${encodeURIComponent(user.name || '')}`}
                        alt={`${user.name || 'User'}'s avatar`}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate">{user.name || 'User'}</h3>
                      <p className="font-mono text-xs opacity-50 truncate">{user.email || 'Player'}</p>
                    </div>
                    <ArrowRight size={16} className="opacity-40 shrink-0" />
                  </div>
                </Link>
              )}

              {/* Theme Selector */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: warmCardBg,
                  border: `2px solid ${warmBorder}`,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9f4eb',
                    borderBottom: `1px solid ${warmBorder}`,
                  }}
                >
                  <Image src={getPokeSprite(currentTheme.pokemonId)} alt="" width={16} height={16} className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                  <span className="font-bold text-xs uppercase tracking-widest opacity-60">{t('themeSelector')}</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {POKEMON_THEMES.map((theme) => {
                      const isExclusive = EXCLUSIVE_THEMES.includes(theme.id);
                      const isLocked = isExclusive && !unlockedThemes.includes(theme.id);
                      const isActive = currentTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (isLocked) {
                              addToast({ type: 'error', title: t('locked'), message: t('unlockThemeCrate') });
                              return;
                            }
                            setTheme(theme);
                          }}
                          className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative overflow-hidden ${isActive
                            ? 'ring-2 ring-offset-1 scale-105'
                            : isLocked
                              ? 'opacity-40 grayscale cursor-not-allowed'
                              : 'opacity-80 active:scale-90'
                            }`}
                          style={{
                            backgroundColor: `${theme.colors.primary}20`,
                            borderColor: isActive ? theme.colors.primary : warmBorder,
                            ...(isActive ? { ringColor: theme.colors.primary } : {}),
                          }}
                          title={isLocked ? `Locked: ${theme.name}` : theme.name}
                        >
                          <Image
                            src={getPokeSprite(theme.pokemonId)}
                            alt={theme.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 drop-shadow-sm"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <span className="text-[9px] font-bold uppercase leading-none truncate w-full text-center">{theme.name}</span>
                          {isLocked && (
                            <span className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                              <Lock size={12} className="text-white" />
                            </span>
                          )}
                          {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fun */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: warmCardBg,
                  border: `2px solid ${warmBorder}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9f4eb',
                    borderBottom: `1px solid ${warmBorder}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pc }} />
                  <span className="font-bold text-xs uppercase tracking-widest opacity-60">{t('fun')}</span>
                </div>
                <div>
                  <CozyMenuItem icon={Cat} label={t('virtualPet')} onClick={() => setShowMobilePet(v => !v)} primaryColor={pc} warmBorder={warmBorder} />
                  <CozyMenuItem icon={Bot} label={t('aiAssistant')} onClick={() => setShowMobileAI(v => !v)} primaryColor={pc} warmBorder={warmBorder} />
                </div>
              </div>

              {/* Menu */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: warmCardBg,
                  border: `2px solid ${warmBorder}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9f4eb',
                    borderBottom: `1px solid ${warmBorder}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pc }} />
                  <span className="font-bold text-xs uppercase tracking-widest opacity-60">{t('menu')}</span>
                </div>
                <div>
                  <CozyMenuItem icon={Info} label={t('about')} onClick={() => setShowAboutSheet(true)} primaryColor={pc} warmBorder={warmBorder} />
                  <CozyMenuItem icon={Shield} label={t('privacyTerms')} onClick={() => setShowPrivacySheet(true)} primaryColor={pc} warmBorder={warmBorder} />
                  {isAdminUser(((user as Record<string, unknown>)?.role || '').toString()) && (
                    <CozyMenuItem icon={Shield} label={t('adminPanel')} href="/admin" primaryColor="#ef4444" danger warmBorder={warmBorder} />
                  )}
                </div>
              </div>

              {/* Settings */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: warmCardBg,
                  border: `2px solid ${warmBorder}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9f4eb',
                    borderBottom: `1px solid ${warmBorder}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pc }} />
                  <span className="font-bold text-xs uppercase tracking-widest opacity-60">{t('settings')}</span>
                </div>
                <div>
                  <button
                    onClick={toggleDarkMode}
                    className="flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                    style={{ borderBottom: `1px solid ${warmBorder}` }}
                  >
                    <div className="flex items-center gap-3">
                      {isDarkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-500" />}
                      <span className="font-bold text-base">{isDarkMode ? t('darkMode') : t('lightMode')}</span>
                    </div>
                    <div
                      className="w-11 h-6 rounded-full flex items-center px-1 transition-all"
                      style={{ backgroundColor: isDarkMode ? pc : '#d1d5db' }}
                    >
                      <m.div
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: isDarkMode ? 18 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                  <button
                    onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
                    className="flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Languages size={18} className="text-purple-400" />
                      <span className="font-bold text-base">{t('language')}</span>
                    </div>
                    <span
                      className="font-mono font-bold text-xs px-3 py-1 rounded-lg"
                      style={{ backgroundColor: `${pc}20`, color: pc }}
                    >
                      {language === 'en' ? '\uD83C\uDDEC\uD83C\uDDE7 EN' : '\uD83C\uDDF9\uD83C\uDDF7 TR'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Logout */}
              {session && (
                <button
                  onClick={() => signOut()}
                  className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 font-bold text-base text-red-500 active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)',
                    border: `2px solid ${isDarkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
                  }}
                >
                  <LogOut size={18} />
                  {t('logout')}
                </button>
              )}

              <div className="text-center py-4">
                <p className="font-mono text-xs opacity-40">{'\u00A9'} {new Date().getFullYear()} CinePurr</p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-black dark:border-white"
        style={{
          backgroundColor: isDarkMode ? darkBg : 'white',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch h-[56px]">
          {([
            { id: 'home' as const, icon: Play, label: t('home') },
            { id: 'features' as const, icon: Grid3X3, label: t('features') },
            { id: 'more' as const, icon: User, label: t('more') },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center relative transition-all ${isActive ? '' : 'active:bg-gray-100 dark:active:bg-gray-800/30'
                  }`}
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-[20%] right-[20%] h-[3px] rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      backgroundColor: pc,
                      transform: 'translateZ(0)',
                    }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? contrastColor : undefined }}
                  className={isActive ? '' : 'opacity-40'}
                />
                <span
                  className={`text-[11px] font-bold mt-0.5 uppercase tracking-wider ${isActive ? '' : 'opacity-40'}`}
                  style={isActive ? { color: contrastColor } : undefined}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Virtual Pet */}
      {showMobilePet && <VirtualPet />}

      {/* Mobile AI Chatbot */}
      {showMobileAI && <AIChatbot />}

      {/* About Bottom Sheet */}
      <AnimatePresence>
        {showAboutSheet && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center"
            onClick={() => setShowAboutSheet(false)}
          >
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: warmPageBg }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: `2px solid ${warmBorder}` }}
              >
                <h2 className="font-black text-lg uppercase tracking-wide">{t('about')}</h2>
                <button
                  onClick={() => setShowAboutSheet(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f0ebe0' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AboutWindow />
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Privacy Bottom Sheet */}
      <AnimatePresence>
        {showPrivacySheet && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center"
            onClick={() => setShowPrivacySheet(false)}
          >
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: warmPageBg }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: `2px solid ${warmBorder}` }}
              >
                <h2 className="font-black text-lg uppercase tracking-wide">{t('privacyTerms')}</h2>
                <button
                  onClick={() => setShowPrivacySheet(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f0ebe0' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PrivacyWindow />
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
    </LazyMotion>
  );
}

/* Cozy Menu Item */
function CozyMenuItem({
  icon: Icon,
  label,
  href,
  onClick,
  primaryColor,
  danger,
  warmBorder,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  primaryColor: string;
  danger?: boolean;
  warmBorder: string;
}) {
  const inner = (
    <div
      className={`flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50 dark:active:bg-gray-800/30 transition-colors ${danger ? 'text-red-500' : ''}`}
      style={{ borderBottom: `1px solid ${warmBorder}` }}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} style={{ color: danger ? '#ef4444' : primaryColor }} />
        <span className="font-bold text-base">{label}</span>
      </div>
      <ArrowRight size={14} className="opacity-40" />
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return <button onClick={onClick} className="w-full">{inner}</button>;
}
