"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import useRouteTransition from '@/hooks/useRouteTransition';
import { useWindowManager } from '@/hooks/useWindowManager';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { POKEMON_THEMES } from '@/lib/pokemonThemes';
import { getPokeSprite } from '@/lib/catThemes';
import { isAdminUser } from '@/lib/security';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import { useLoading } from '@/components/Loading/LoadingProvider';
import { useBadges } from '@/components/Badges/BadgeProvider';
import { useToast } from '@/components/ui/Toast';
import { useKonamiCode, useClickCounter, GlowBadge } from '@/components/FunEffects';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Sparkles, PartyPopper, Moon, Sun, Medal, LogOut, User, ChevronDown, Shield, Info, FileText, Mail, Languages, BookOpen } from 'lucide-react';
import Logo from '@/components/Logo';
import dynamic from 'next/dynamic';
import { Star, Flame, Trophy, Activity, Target, Gift, Gamepad2, Heart, BarChart2, History, Bookmark } from 'lucide-react';
import type { WindowId } from '@/hooks/useWindowManager';
import { useI18n } from '@/lib/i18n';
import { ServerBrowser, CreateRoomForm, FilmNewsWidget } from '@/components/home';
import { MobileHome } from '@/components/home/MobileHome';

// Dynamic imports — deferred from initial bundle to reduce JS payload
const FloatingParticles = dynamic(() => import('@/components/FunEffects').then(m => ({ default: m.FloatingParticles })), { ssr: false });
const PartyEffects = dynamic(() => import('@/components/FunEffects').then(m => ({ default: m.PartyEffects })), { ssr: false });
const NotificationBar = dynamic(() => import('@/components/NotificationBar'), { ssr: false });
const FriendsList = dynamic(() => import('@/components/FriendsList'), { ssr: false });
const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), { ssr: false });
const HomeStatWindows = dynamic(() => import('@/components/home/HomeStatWindows').then(m => ({ default: m.HomeStatWindows })), { ssr: false });

// Dynamic import to avoid SSR issues
const Dock = dynamic(() => import('@/components/Dock'), {
  ssr: false,
});




export interface Room {
  id: string;
  name: string | null;
  currentVideoTitle: string;
  onlineCount: number;
  maxUsers: number;
  _count: {
    messages: number;
  }
}

export default function HomeClient({ initialRooms = [] }: { initialRooms?: Room[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isRouting = useRouteTransition();
  const user = session?.user;
  const { show: showLoading, hide: hideLoading } = useLoading();
  const { awardBadge, hasBadge, isReady: badgesReady } = useBadges();
  const { addToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [publicRooms, setPublicRooms] = useState<Room[]>(initialRooms);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  // Removed old pixel cat fact state and handler
  const [isLoaded, setIsLoaded] = useState(false);
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>([]);
  const EXCLUSIVE_THEMES = ['umbreon', 'flareon', 'gengar', 'sylveon', 'party'];

  // Fun effects state
  const [showConfetti, setShowConfetti] = useState(false);
  const [partyMode, setPartyMode] = useState(false);

  // Konami code easter egg
  useKonamiCode(useCallback(() => {
    if (!badgesReady) return;
    setPartyMode(true);
    setShowConfetti(true);
    try { awardBadge('konami', 'Konami Master', 'Found the secret code!', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=konami'); } catch { }
    setTimeout(() => setPartyMode(false), 10000);
  }, [awardBadge, badgesReady]));

  // Logo click easter egg
  const logoClicks = useClickCounter(7);

  // Create Room Modal State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [maxUsers, setMaxUsers] = useState(20);

  // Theme State
  const { currentTheme, setTheme, pokemonSprite, isDarkMode, toggleDarkMode } = usePokemonTheme();

  // Language State
  const { language, setLanguage, t } = useI18n();

  // Window Manager
  const wm = useWindowManager();

  // Mobile Detection (Undefined = SSR, true = Mobile, false = Desktop)
  const isMobile = useIsMobile();

  useEffect(() => {
    // Trigger load animation on mount
    const timeout = setTimeout(() => setIsLoaded(true), 50);

    if (session?.user) {
      fetch('/api/user')
        .then(res => res.json())
        .then(data => {
          if (data && data.unlockedThemes) {
            setUnlockedThemes(data.unlockedThemes);
          }
        })
        .catch(err => console.error('Failed to fetch user themes:', err));
    }

    return () => clearTimeout(timeout);
  }, [session]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    if (searchParams.get('createRoom') !== '1' || showCreateForm) {
      return;
    }

    setShowCreateForm(true);
    router.replace('/');
  }, [router, searchParams, showCreateForm, status]);

  // ...existing code...

  // Memoize room fetching with useCallback (used as initial load + fallback)
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await res.json();
      // Ensure data is always an array
      setPublicRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      // Set to empty array on error to prevent map errors
      setPublicRooms([]);
    }
  }, []);

  // Use socket push for real-time room list updates (replaces 10s polling)
  const { socket: globalSocket } = useGlobalSocket();

  useEffect(() => {
    // If we didn't get initialRooms (e.g. error fetching), fall back to HTTP fetch
    if (initialRooms.length === 0) {
      fetchRooms();
    }

    // Listen for server-pushed room list updates via socket
    if (globalSocket) {
      const handleRoomsList = (rooms: Room[]) => {
        setPublicRooms(Array.isArray(rooms) ? rooms : []);
      };
      globalSocket.on('rooms:list', handleRoomsList);

      return () => {
        globalSocket.off('rooms:list', handleRoomsList);
      };
    }
  }, [fetchRooms, globalSocket]);

  const createRoom = () => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      sessionStorage.setItem('redirect_url', '/?createRoom=1');
      router.push('/login');
      return;
    }

    setShowCreateForm(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    showLoading();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          isPublic: isPublicRoom,
          maxUsers: maxUsers
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `Failed to create room (${res.status})`);
      }

      const data = await res.json();
      // Only award first-room badge if user doesn&apos;t already have it AND this is actually their first room
      if (!hasBadge('first-room')) {
        // Award first room badge since achievements system is removed
        awardBadge('first-room', 'First Room', 'Created your first room', '🎬');
      }

      // Refresh room list immediately so the new room appears
      await fetchRooms();

      hideLoading();
      setShowCreateForm(false);
      setIsCreating(false);
      router.push(`/room/${data.roomId}`);
    } catch (error) {
      console.error(error);
      setIsCreating(false);
      hideLoading();
      addToast({
        type: 'error',
        title: 'Failed to create room',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;

    // Validate room exists before navigating
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (res.ok) {
        router.push(`/room/${code}`);
      } else {
        addToast({
          type: 'error',
          title: 'Room Not Found',
          message: 'No room exists with that code. Please check and try again.'
        });
      }
    } catch {
      // If API fails, try to join anyway (backward compatibility)
      router.push(`/room/${code}`);
    }
  };

  // Removed old Pokémon fact click handler

  // Trigger confetti on logo easter egg
  useEffect(() => {
    if (logoClicks.triggered) {
      setShowConfetti(true);
      setPartyMode(true);
      setTimeout(() => setPartyMode(false), 5000);
    }
  }, [logoClicks.triggered]);

  return (
    <main
      suppressHydrationWarning
      className={`min-h-screen min-h-[100dvh] overflow-x-hidden overflow-y-auto flex flex-col text-black dark:text-white transition-all duration-500 ease-out ${partyMode ? 'animate-gradient' : ''}`}
      style={{
        backgroundColor: isDarkMode ? 'transparent' : currentTheme.colors.background,
        ...(partyMode && { backgroundImage: 'linear-gradient(-45deg, #ff6b6b, #feca57, #48dbfb, #1dd1a1, #5f27cd)', backgroundSize: '400% 400%' })
      }}
    >
      {/* Background Effects - Graph Paper + CRT Scanlines (only on bg, not on content) */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="graph-paper-bg-subtle text-current h-full w-full" />
        <div className="crt-scanlines-subtle h-full w-full" />
      </div>

      {/* Ambient Gradient Orbs - soft colored blobs floating behind content */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.07] dark:opacity-[0.12] animate-float"
          style={{ backgroundColor: currentTheme.colors.primary, top: '10%', left: '-5%', animationDuration: '15s', animationDelay: '0s' }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05] dark:opacity-[0.10] animate-float"
          style={{ backgroundColor: currentTheme.colors.secondary || currentTheme.colors.primary, top: '50%', right: '-8%', animationDuration: '20s', animationDelay: '5s' }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full blur-[100px] opacity-[0.04] dark:opacity-[0.08] animate-float"
          style={{ backgroundColor: currentTheme.colors.accent || currentTheme.colors.primary, bottom: '5%', left: '30%', animationDuration: '18s', animationDelay: '3s' }}
        />
      </div>

      {/* Soft vignette overlay for depth */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.08) 100%)' }} />

      {/* Floating Particles Background */}
      <FloatingParticles />

      {/* Party Effects - Confetti, Border Glow, Flash */}
      <PartyEffects active={partyMode} duration={5000} />

      {/* Mobile Home — replaces entire desktop layout on small screens */}
      {isMobile !== false && (
        <MobileHome
          publicRooms={searchParams?.get('testempty') === 'true' ? [] : publicRooms}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onCreateRoom={createRoom}
          onJoinCode={handleJoinCode}
          isCreating={isCreating}
          showCreateForm={showCreateForm}
          setShowCreateForm={setShowCreateForm}
          onOpenWindow={(windowName) => wm.toggleWindow(windowName as WindowId)}
          unlockedThemes={unlockedThemes}
          onSubmitRoom={handleCreateRoom}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          maxUsers={maxUsers}
          setMaxUsers={setMaxUsers}
          isPublicRoom={isPublicRoom}
          setIsPublicRoom={setIsPublicRoom}
          partyMode={partyMode}
        />
      )}

      {/* Navbar — desktop only */}
      {isMobile !== true && (
        <nav
          className={`hidden sm:flex h-14 sm:h-16 border-b-4 border-black dark:border-white items-center justify-between px-2 sm:px-4 md:px-6 shrink-0 z-50 shadow-sm transition-all duration-500 sticky top-0 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${partyMode ? 'party-navbar-rainbow' : ''}`}
          style={{ backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : 'white', borderTopWidth: '3px', borderTopColor: partyMode ? 'transparent' : currentTheme.colors.primary }}
        >
          <Link
            href="/"
            className="flex items-center gap-3 group cursor-pointer"
            onClick={(e) => {
              // Prevent navigation during easter egg clicks
              if (logoClicks.clicks > 0 && logoClicks.clicks < 7) {
                e.preventDefault();
              }
              logoClicks.handleClick();
            }}
          >
            <Logo size="md" onClick={() => { }} className={partyMode ? 'animate-bounce' : ''} />
            {partyMode && <span className="ml-2 animate-bounce inline-block"><PartyPopper size={28} /></span>}
            {logoClicks.clicks > 0 && logoClicks.clicks < 7 && (
              <span className="text-xs font-mono opacity-50 animate-pulse">{7 - logoClicks.clicks}...</span>
            )}
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Party Mode Indicator */}
            {partyMode && (
              <div className="hidden sm:inline-flex">
                <GlowBadge color="#ff69b4">PARTY MODE! <PartyPopper size={20} className="inline" /></GlowBadge>
              </div>
            )}

            {/* Notifications */}
            {user && <NotificationBar />}

            {/* Friends */}
            {user && <FriendsList />}

            {user ? (
              <div className="relative">
                {/* User Avatar Button */}
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 px-2 rounded border-2 border-transparent hover:border-black dark:hover:border-white transition-all duration-300 group"
                >
                  <div className="w-8 h-8 border-2 border-black dark:border-white overflow-hidden bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-all duration-300">
                    {user.image && user.image.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={`${user.name}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.avatar-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'avatar-fallback w-full h-full flex items-center justify-center text-white font-bold';
                            fallback.style.backgroundColor = currentTheme.colors.primary;
                            fallback.textContent = user.name && user.name[0] ? user.name[0].toUpperCase() : "?";
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : user.name ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/avatar/${encodeURIComponent(user.name)}`}
                        alt={`${user.name}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.avatar-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'avatar-fallback w-full h-full flex items-center justify-center text-white font-bold';
                            fallback.style.backgroundColor = currentTheme.colors.primary;
                            fallback.textContent = user.name && user.name[0] ? user.name[0].toUpperCase() : "?";
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: currentTheme.colors.primary }}
                      >
                        ?
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-sm hidden sm:block">{user.name ?? ""}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setShowUserMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="p-3 border-b-2 border-black dark:border-white bg-gray-50 dark:bg-gray-800">
                        <p className="font-bold text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || t('player')}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href={`/profile/${user.name}`}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                        >
                          <User size={18} /> {t('profile')}
                        </Link>



                        {/* Dark Mode Toggle in Menu */}
                        <button
                          onClick={toggleDarkMode}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                        >
                          {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-blue-500" />}
                          {isDarkMode ? t('lightMode') : t('darkMode')}
                        </button>

                        {/* Language Toggle in Menu */}
                        <button
                          onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                        >
                          <Languages size={18} className="text-purple-500" />
                          {language === 'en' ? 'Türkçe' : 'English'}
                        </button>

                        {isAdminUser((user.role || '').toString()) ? (
                          <Link
                            href="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm text-red-500"
                          >
                            <Shield size={18} /> Admin Panel
                          </Link>
                        ) : null}
                      </div>

                      {/* Logout */}
                      <div className="border-t-2 border-black dark:border-white py-1">
                        <button
                          onClick={() => { signOut(); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm text-red-500"
                        >
                          <LogOut size={18} /> {t('logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex gap-3" data-tour="auth-buttons">
                <Link href="/login" className="text-sm font-bold border-2 border-black dark:border-white px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none transition-all duration-200 hover:-translate-y-0.5">{t('login').toUpperCase()}</Link>
                <Link
                  href="/register"
                  className="text-sm font-bold border-2 border-black dark:border-white px-3 py-1 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  style={{ backgroundColor: currentTheme.colors.primary }}
                >
                  {t('register').toUpperCase()}
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Content Grid — desktop only */}
      {isMobile !== true && (
        <div className="hidden sm:flex flex-1 p-3 sm:p-6 md:p-8 flex-col items-center justify-start sm:justify-center gap-4 sm:gap-6 md:gap-8 relative z-10 pb-24 sm:pb-28">
          <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">

            {/* Left Column: Hero Window */}
            <div className={`flex flex-col h-auto min-h-[350px] sm:h-[400px] md:h-[450px] animate-slide-in-left`}>
              <div
                suppressHydrationWarning
                className="border-4 border-black dark:border-white h-full flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] sm:dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] relative overflow-hidden transition-all duration-500 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.3)] sm:dark:hover:shadow-[16px_16px_0px_0px_rgba(255,255,255,0.3)] group/hero hero-glow-border"
                style={{ backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : 'white', '--glow-color': currentTheme.colors.primary } as React.CSSProperties}
              >
                {/* Animated gradient overlay for hero */}
                <div
                  suppressHydrationWarning
                  className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none animate-gradient-slow"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${currentTheme.colors.primary}40 0%, transparent 50%, ${currentTheme.colors.accent || currentTheme.colors.primary}40 100%)`,
                    backgroundSize: '200% 200%'
                  }}
                />

                {/* Window Header */}
                <div suppressHydrationWarning className="text-white p-2 flex justify-between items-center border-b-4 border-black dark:border-white shrink-0" style={{ background: `linear-gradient(135deg, #111 0%, ${currentTheme.colors.primary}44 100%)` }}>
                  <span className="font-mono font-bold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.colors.primary }}></span>
                    CINEPURR_PLAYER.EXE
                  </span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-white border border-gray-500 transition-colors duration-200 hover:bg-yellow-400 cursor-pointer"></div>
                    <div className="w-3 h-3 bg-white border border-gray-500 transition-colors duration-200 hover:bg-green-400 cursor-pointer"></div>
                    <div className="w-3 h-3 bg-[#ff5555] border border-gray-500 transition-colors duration-200 hover:bg-red-600 cursor-pointer"></div>
                  </div>
                </div>

                {/* Window Content */}
                <div className={`flex-1 p-4 flex flex-col relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden transition-all duration-500 ${showCreateForm ? 'backdrop-blur-sm' : ''}`}>

                  {/* Blur Overlay when creating server */}
                  {showCreateForm && (
                    <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md z-0 ${isRouting ? '' : 'animate-fade-in-scale'}`} />
                  )}

                  {/* Pokemon Mascot - Animated GIF */}
                  <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 z-0 transition-all duration-700 ease-out transform hover:scale-125 hover:rotate-6 ${showCreateForm ? 'opacity-30 blur-sm scale-75' : 'opacity-100 scale-100'} ${partyMode ? 'animate-spin-slow' : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pokemonSprite} alt={currentTheme.name} width={128} height={128} loading="eager" fetchPriority="high" className="w-20 h-20 sm:w-32 sm:h-32 block object-contain drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] dark:drop-shadow-[4px_4px_0_rgba(255,255,255,0.2)] animate-bounce-subtle" style={{ imageRendering: 'pixelated' }} />
                  </div>

                  {!showCreateForm ? (
                    <>
                      <div className="z-10 mt-2">
                        <h1
                          suppressHydrationWarning
                          className={`text-6xl sm:text-6xl md:text-6xl lg:text-7xl font-black drop-shadow-[4px_4px_0_#000] dark:drop-shadow-[4px_4px_0_#fff] leading-none mb-2 transition-all duration-500 tracking-tighter hover:tracking-tight ${partyMode ? 'animate-rainbow-text' : ''}`}
                          style={{
                            color: partyMode ? undefined : currentTheme.colors.primary,
                            backgroundImage: partyMode ? undefined : `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 50%, ${currentTheme.colors.primary} 100%)`,
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: partyMode ? undefined : 'text',
                            WebkitTextFillColor: partyMode ? undefined : 'transparent',
                          }}
                        >
                          WATCH<br />TOGETHER
                        </h1>
                        <div className="inline-block bg-black dark:bg-white text-white dark:text-black px-2 py-1 font-bold text-xs sm:text-sm transform -rotate-1 border-2 border-white dark:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:rotate-0 transition-transform duration-300 hover:scale-105">
                          {partyMode ? <><PartyPopper size={16} className="inline" /> Party time! <PartyPopper size={16} className="inline" /></> : 'No lag. Just vibes. :3'}
                        </div>
                      </div>

                      <div className="mt-auto z-10 space-y-2 sm:space-y-3">
                        <div className="flex gap-2 sm:gap-4">
                          <button
                            suppressHydrationWarning
                            type="button"
                            onClick={createRoom}
                            disabled={isCreating}
                            data-tour="create-room"
                            className={`flex-1 text-black font-black border-2 sm:border-4 border-black dark:border-white p-2 sm:p-3 text-sm sm:text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] sm:dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] sm:dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 ease-out flex items-center justify-center gap-1 sm:gap-2 group ripple overflow-hidden relative ${partyMode ? 'animate-jelly' : ''}`}
                            style={{ backgroundColor: currentTheme.colors.primary }}
                          >
                            <span>{isCreating ? t('loading') : t('createRoom')}</span>
                            <Sparkles size={18} className="hidden sm:block group-hover:animate-bounce transition-transform duration-300 group-hover:scale-125" />
                          </button>
                        </div>

                        <form data-tour="join-room" onSubmit={handleJoinCode} className="flex shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] sm:dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-shadow duration-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                          <input
                            type="text"
                            placeholder={t('enterCode')}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="flex-1 border-2 sm:border-4 border-black dark:border-white border-r-0 p-2 font-mono font-bold text-sm sm:text-base outline-none focus:bg-gray-50 dark:focus:bg-gray-700 dark:bg-gray-800 dark:text-white transition-colors duration-200 min-w-0"
                          />
                          <button
                            type="submit"
                            className="bg-black dark:bg-white text-white dark:text-black px-3 sm:px-4 font-bold text-sm sm:text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 border-2 sm:border-4 border-black dark:border-white border-l-0 hover:px-4 sm:hover:px-6"
                          >
                            {t('joinRoom')}
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <CreateRoomForm
                      onSubmit={handleCreateRoom}
                      onClose={() => setShowCreateForm(false)}
                      newRoomName={newRoomName}
                      setNewRoomName={setNewRoomName}
                      maxUsers={maxUsers}
                      setMaxUsers={setMaxUsers}
                      isPublicRoom={isPublicRoom}
                      setIsPublicRoom={setIsPublicRoom}
                      isCreating={isCreating}
                      primaryColor={currentTheme.colors.primary}
                      t={t}
                    />
                  )}
                </div>

                {/* Theme Bar (Bottom of Window) */}
                <div
                  data-tour="theme-bar"
                  className="border-t-4 border-black dark:border-white p-2 sm:p-3 flex items-center gap-2 sm:gap-3 overflow-x-auto pixel-scrollbar shrink-0"
                  style={{ backgroundColor: isDarkMode ? 'black' : '#f3f4f6' }}
                >
                  <span className="font-bold text-[10px] sm:text-xs whitespace-nowrap flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getPokeSprite(currentTheme.pokemonId)} alt="Current theme" className="w-4 h-4 sm:w-5 sm:h-5" style={{ imageRendering: 'pixelated' }} /> THEME:
                  </span>
                  <div className="flex gap-1 sm:gap-2">
                    {POKEMON_THEMES.map((theme, index) => {
                      const isExclusive = EXCLUSIVE_THEMES.includes(theme.id);
                      const isLocked = isExclusive && !unlockedThemes.includes(theme.id);

                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (isLocked) {
                              addToast({
                                type: 'error',
                                title: 'Locked Theme',
                                message: 'You must unlock this exclusive theme from a Crate first!'
                              });
                              return;
                            }
                            setTheme(theme);
                          }}
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm border sm:border-2 border-black dark:border-white flex-shrink-0 transition-all duration-300 ${!isLocked && 'sm:hover:scale-125 sm:hover:-translate-y-1 active:scale-90'} relative flex items-center justify-center overflow-hidden ${currentTheme.id === theme.id
                            ? 'ring-2 ring-black dark:ring-white ring-offset-1 scale-110'
                            : isLocked ? 'opacity-40 grayscale cursor-not-allowed' : 'opacity-70 sm:hover:opacity-100'
                            }`}
                          style={{
                            backgroundColor: theme.colors.primary,
                            transitionDelay: `${index * 30}ms`
                          }}
                          title={isLocked ? `Locked: ${theme.name}` : theme.name}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getPokeSprite(theme.pokemonId)} alt={theme.name} className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]" style={{ imageRendering: 'pixelated' }} />
                          {isLocked && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[10px]">🔒</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {/* Party Mode Theme Button */}
                    <button
                      onClick={() => {
                        if (!unlockedThemes.includes('party')) {
                          addToast({
                            type: 'error',
                            title: 'Locked Theme',
                            message: 'You must unlock Party Mode from a Crate first!'
                          });
                          return;
                        }
                        // Trigger party mode
                        setPartyMode(true);
                        setShowConfetti(true);
                        setTimeout(() => setPartyMode(false), 10000);
                      }}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm border sm:border-2 border-black dark:border-white flex-shrink-0 transition-all duration-300 sm:hover:scale-125 sm:hover:-translate-y-1 active:scale-90 relative flex items-center justify-center overflow-hidden ${!unlockedThemes.includes('party') ? 'opacity-40 grayscale cursor-not-allowed' : 'opacity-70 sm:hover:opacity-100 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500'}
                      `}
                      title={!unlockedThemes.includes('party') ? 'Locked: Party Mode' : 'Party Mode'}
                    >
                      <span className="text-xs sm:text-sm">🎉</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Server Browser Window */}
            <div data-tour="server-browser">
              <ServerBrowser
                publicRooms={searchParams?.get('testempty') === 'true' ? [] : publicRooms}
                primaryColor={currentTheme.colors.primary}
                darkBackground={currentTheme.colors.darkBackground}
                isDarkMode={isDarkMode}
                isLoaded={isLoaded}
                t={t}
              />
            </div>

          </div>

          {/* Bottom Section: Film News */}
          <div className={`w-full max-w-4xl animate-fade-in-up`} style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <FilmNewsWidget />
          </div>
        </div>
      )}

      {/* Footer — desktop only */}
      {isMobile !== true && (
        <footer className={`hidden sm:block relative p-6 pb-24 text-center text-sm transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {/* Top accent line */}
          <div className="w-24 h-1 mx-auto mb-4 rounded-full opacity-40" style={{ backgroundColor: currentTheme.colors.primary }} />
          <p className="opacity-90 text-xs">© {new Date().getFullYear()} CinePurr. {t('allRightsReserved')}</p>
          <p className="text-xs mt-1 opacity-80">Pokémon sprites via <a href="https://pokeapi.co/" rel="noopener noreferrer" className="underline hover:opacity-100 transition-opacity">PokéAPI</a> • Pokémon © Nintendo/Game Freak</p>
        </footer>
      )}

      {/* Dock - Only show on desktop when user is logged in */}
      {
        session && session.user && (
          <div className="hidden sm:block">
            <Dock
              items={[
                {
                  icon: <Trophy size={18} className="text-yellow-500" />,
                  label: t('leaderboard'),
                  onClick: () => wm.toggleWindow('leaderboard')
                },
                {
                  icon: <Target size={18} className="text-green-400" />,
                  label: t('dailyQuests'),
                  onClick: () => wm.toggleWindow('quests')
                },
                {
                  icon: <Gift size={18} className="text-pink-400" />,
                  label: t('crates'),
                  onClick: () => wm.toggleWindow('crates')
                },
                {
                  icon: <Gamepad2 size={18} className="text-purple-400" />,
                  label: t('minigames'),
                  onClick: () => wm.toggleWindow('minigames')
                },
                {
                  icon: <Medal size={18} className="text-yellow-400" />,
                  label: 'Achievements',
                  onClick: () => wm.toggleWindow('achievements')
                },
                {
                  icon: <BookOpen size={18} className="text-indigo-400" />,
                  label: t('studyRoom'),
                  onClick: () => router.push('/study')
                },
                {
                  icon: <Info size={18} className="text-blue-500" />,
                  label: t('about'),
                  onClick: () => wm.toggleWindow('about')
                },
                {
                  icon: <FileText size={18} className="text-gray-600" />,
                  label: t('privacyTerms'),
                  onClick: () => wm.toggleWindow('privacy')
                },
                {
                  icon: <Mail size={18} className="text-green-500" />,
                  label: t('contact'),
                  onClick: () => wm.toggleWindow('contact')
                },
                {
                  icon: <Heart size={18} className="text-yellow-500 fill-yellow-500" />,
                  label: "Support CinePurr & keep the vibes cozy! :3",
                  onClick: () => window.open('https://buymeacoffee.com/cinepurr', '_blank'),
                  className: "!bg-yellow-100 hover:!bg-yellow-200 dark:!bg-yellow-900 dark:hover:!bg-yellow-800 border-2 !border-yellow-400"
                }
              ]}
              panelHeight={68}
              baseItemSize={50}
              magnification={70}
              themeColor={currentTheme.colors.primary}
            />
          </div>
        )
      }

      {/* Old MobileNav removed — MobileHome has its own bottom nav */}

      {/* All Stat & Info Windows */}
      <HomeStatWindows
        wm={wm}
        isLoggedIn={!!(session && session.user)}
        t={t}
      />

      {/* Onboarding Tour for new users */}
      <OnboardingTour isLoggedIn={!!(session && session.user)} />

    </main >
  );
}
