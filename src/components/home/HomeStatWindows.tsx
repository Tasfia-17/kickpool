"use client";

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { Star, Flame, Trophy, Activity, Target, Gift, Gamepad2, Info, Shield, Mail, Award, BarChart2, History, Bookmark } from 'lucide-react';
import { StatWindow } from '@/components/StatWindow';
import type { WindowId } from '@/hooks/useWindowManager';

// Lazy-load every child — none render until the user opens the window
const XPDisplay = dynamic(() => import('@/components/engagement/XPDisplay').then(m => ({ default: m.XPDisplay })), { ssr: false });
const StreakDisplay = dynamic(() => import('@/components/engagement/StreakDisplay').then(m => ({ default: m.StreakDisplay })), { ssr: false });
const Leaderboard = dynamic(() => import('@/components/engagement/Leaderboard').then(m => ({ default: m.Leaderboard })), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/engagement/ActivityFeed').then(m => ({ default: m.ActivityFeed })), { ssr: false });
const DailyQuests = dynamic(() => import('@/components/engagement/DailyQuests').then(m => ({ default: m.DailyQuests })), { ssr: false });
const CrateOpener = dynamic(() => import('@/components/games/CrateOpener').then(m => ({ default: m.CrateOpener })), { ssr: false });
const MinigamesHub = dynamic(() => import('@/components/games/MinigamesHub').then(m => ({ default: m.MinigamesHub })), { ssr: false });
const AboutWindow = dynamic(() => import('@/components/windows/AboutWindow').then(m => ({ default: m.AboutWindow })), { ssr: false });
const AchievementsWindow = dynamic(() => import('@/components/windows/AchievementsWindow').then(m => ({ default: m.AchievementsWindow })), { ssr: false });
const StatsWindow = dynamic(() => import('@/components/windows/StatsWindow').then(m => ({ default: m.StatsWindow })), { ssr: false });
const HistoryWindow = dynamic(() => import('@/components/windows/HistoryWindow').then(m => ({ default: m.HistoryWindow })), { ssr: false });
const WatchlistWindow = dynamic(() => import('@/components/windows/WatchlistWindow').then(m => ({ default: m.WatchlistWindow })), { ssr: false });
const PrivacyWindow = dynamic(() => import('@/components/windows/PrivacyWindow').then(m => ({ default: m.PrivacyWindow })), { ssr: false });
const ContactWindow = dynamic(() => import('@/components/windows/ContactWindow').then(m => ({ default: m.ContactWindow })), { ssr: false });

interface WindowManager {
  windows: Record<WindowId, boolean>;
  closeWindow: (name: WindowId) => void;
  focusWindow: (name: WindowId) => void;
  getZIndex: (name: WindowId) => number;
}

interface HomeStatWindowsProps {
  wm: WindowManager;
  isLoggedIn: boolean;
  t: (key: string) => string;
}

export const HomeStatWindows = memo(function HomeStatWindows({
  wm,
  isLoggedIn,
  t,
}: HomeStatWindowsProps) {
  return (
    <>
      {/* Stat Windows - Only for logged-in users */}
      {isLoggedIn && (
        <>
          <StatWindow
            isOpen={wm.windows.xp}
            onClose={() => wm.closeWindow('xp')}
            onFocus={() => wm.focusWindow('xp')}
            title={t('xpLevel')}
            icon={<Star size={16} />}
            zIndex={wm.getZIndex('xp')}
            windowType="utility"
          >
            <XPDisplay />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.streak}
            onClose={() => wm.closeWindow('streak')}
            onFocus={() => wm.focusWindow('streak')}
            title={t('loginStreak')}
            icon={<Flame size={16} />}
            zIndex={wm.getZIndex('streak')}
            windowType="utility"
          >
            <StreakDisplay />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.leaderboard}
            onClose={() => wm.closeWindow('leaderboard')}
            onFocus={() => wm.focusWindow('leaderboard')}
            title={t('leaderboard')}
            icon={<Trophy size={16} />}
            zIndex={wm.getZIndex('leaderboard')}
            windowType="utility"
          >
            <Leaderboard />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.activity}
            onClose={() => wm.closeWindow('activity')}
            onFocus={() => wm.focusWindow('activity')}
            title={t('netLog')}
            icon={<Activity size={16} />}
            zIndex={wm.getZIndex('activity')}
            windowType="utility"
          >
            <ActivityFeed />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.quests}
            onClose={() => wm.closeWindow('quests')}
            onFocus={() => wm.focusWindow('quests')}
            title={t('dailyQuests')}
            icon={<Target size={16} />}
            zIndex={wm.getZIndex('quests')}
            windowType="utility"
          >
            <DailyQuests />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.crates}
            onClose={() => wm.closeWindow('crates')}
            onFocus={() => wm.focusWindow('crates')}
            title={t('crates')}
            icon={<Gift size={16} />}
            zIndex={wm.getZIndex('crates')}
            windowType="utility"
          >
            <CrateOpener />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.minigames}
            onClose={() => wm.closeWindow('minigames')}
            onFocus={() => wm.focusWindow('minigames')}
            title={t('arcade')}
            icon={<Gamepad2 size={16} />}
            zIndex={wm.getZIndex('minigames')}
            windowType="game"
          >
            <MinigamesHub />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.achievements}
            onClose={() => wm.closeWindow('achievements')}
            onFocus={() => wm.focusWindow('achievements')}
            title="Achievements"
            icon={<Award size={16} />}
            zIndex={wm.getZIndex('achievements')}
            windowType="utility"
            width={650}
            height={550}
          >
            <AchievementsWindow />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.stats}
            onClose={() => wm.closeWindow('stats')}
            onFocus={() => wm.focusWindow('stats')}
            title="Your Stats"
            icon={<BarChart2 size={16} />}
            zIndex={wm.getZIndex('stats')}
            windowType="utility"
          >
            <StatsWindow />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.history}
            onClose={() => wm.closeWindow('history')}
            onFocus={() => wm.focusWindow('history')}
            title="Watch History"
            icon={<History size={16} />}
            zIndex={wm.getZIndex('history')}
            windowType="utility"
          >
            <HistoryWindow />
          </StatWindow>

          <StatWindow
            isOpen={wm.windows.watchlist}
            onClose={() => wm.closeWindow('watchlist')}
            onFocus={() => wm.focusWindow('watchlist')}
            title="My Watchlist"
            icon={<Bookmark size={16} />}
            zIndex={wm.getZIndex('watchlist')}
            windowType="utility"
          >
            <WatchlistWindow />
          </StatWindow>
        </>
      )}

      {/* Info Windows - Available for all users */}
      <StatWindow
        isOpen={wm.windows.about}
        onClose={() => wm.closeWindow('about')}
        onFocus={() => wm.focusWindow('about')}
        title={t('aboutCinePurr')}
        icon={<Info size={16} />}
        zIndex={wm.getZIndex('about')}
        windowType="utility"
      >
        <AboutWindow />
      </StatWindow>

      <StatWindow
        isOpen={wm.windows.privacy}
        onClose={() => wm.closeWindow('privacy')}
        onFocus={() => wm.focusWindow('privacy')}
        title={t('privacyTerms')}
        icon={<Shield size={16} />}
        zIndex={wm.getZIndex('privacy')}
        windowType="utility"
      >
        <PrivacyWindow />
      </StatWindow>

      <StatWindow
        isOpen={wm.windows.contact}
        onClose={() => wm.closeWindow('contact')}
        onFocus={() => wm.focusWindow('contact')}
        title={t('contactUs')}
        icon={<Mail size={16} />}
        zIndex={wm.getZIndex('contact')}
        windowType="utility"
      >
        <ContactWindow />
      </StatWindow>
    </>
  );
});
