'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, X, Home, Gamepad2, Gift, Trophy, Target, Activity,
  Settings, LogOut, User, Moon, Sun, Languages, BookOpen,
  Star, Flame, Medal, Shield, ChevronRight
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

interface MobileNavProps {
  onOpenWindow: (window: string) => void;
  currentTheme: any;
}

export default function MobileNav({ onOpenWindow, currentTheme }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const { isDarkMode, toggleDarkMode, pokemonSprite } = usePokemonTheme();
  const { language, setLanguage, t } = useI18n();
  const [activeTab, setActiveTab] = useState('home');

  // Bottom tab items
  const bottomTabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'rewards', icon: Gift, label: 'Rewards' },
    { id: 'stats', icon: Trophy, label: 'Stats' },
    { id: 'menu', icon: Menu, label: 'More' },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'menu') {
      setIsOpen(true);
    } else if (tabId === 'games') {
      onOpenWindow('minigames');
      setActiveTab(tabId);
    } else if (tabId === 'rewards') {
      onOpenWindow('crates');
      setActiveTab(tabId);
    } else if (tabId === 'stats') {
      // Open XP window for stats (shows level, XP, etc)
      onOpenWindow('xp');
      setActiveTab(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar - iOS/Android style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className={`flex items-center justify-around py-2 px-1 border-t-2 ${isDarkMode
              ? 'bg-gray-900/95 border-white/20'
              : 'bg-white/95 border-black/20'
            } backdrop-blur-lg`}
        >
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${isActive
                    ? 'scale-110'
                    : 'opacity-60 hover:opacity-100'
                  }`}
              >
                <div
                  className={`p-2 rounded-xl transition-all ${isActive ? 'bg-pink-500/20' : ''
                    }`}
                >
                  <Icon
                    size={24}
                    style={{ color: isActive ? currentTheme.colors.primary : isDarkMode ? '#fff' : '#000' }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-black'
                    }`}
                  style={{ color: isActive ? currentTheme.colors.primary : undefined }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Full Screen Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] sm:hidden"
            />

            {/* Menu Panel - Slide from bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed inset-x-0 bottom-0 z-[101] sm:hidden rounded-t-3xl overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'
                }`}
              style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center py-3">
                <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-black/20'}`} />
              </div>

              {/* Header */}
              <div className={`flex items-center justify-between px-5 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                <div className="flex items-center gap-3">
                  <img
                    src={pokemonSprite}
                    alt={`${session?.user?.name || 'Guest'}'s avatar`}
                    className="w-12 h-12 rounded-full border-2"
                    style={{ borderColor: currentTheme.colors.primary }}
                  />
                  <div>
                    <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {session?.user?.name || 'Guest'}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('tapToViewProfile')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}
                >
                  <X size={24} className={isDarkMode ? 'text-white' : 'text-black'} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="overflow-y-auto px-4 py-4 space-y-2" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { icon: Target, label: 'Quests', action: () => onOpenWindow('quests') },
                    { icon: Activity, label: 'Activity', action: () => onOpenWindow('activity') },
                    { icon: Star, label: 'Leaders', action: () => onOpenWindow('leaderboard') },
                    { icon: Medal, label: 'Achieve', action: () => window.location.href = '/achievements' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { item.action(); setIsOpen(false); }}
                      className={`flex flex-col items-center p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 active:bg-white/10' : 'bg-black/5 active:bg-black/10'
                        }`}
                    >
                      <item.icon size={24} style={{ color: currentTheme.colors.primary }} />
                      <span className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Menu List */}
                <div className="space-y-1">
                  <MenuLink
                    icon={User}
                    label={t('profile')}
                    href="/profile"
                    isDarkMode={isDarkMode}
                    onClick={() => setIsOpen(false)}
                  />
                  <MenuLink
                    icon={Settings}
                    label={t('settings')}
                    href="/settings"
                    isDarkMode={isDarkMode}
                    onClick={() => setIsOpen(false)}
                  />
                  <MenuLink
                    icon={BookOpen}
                    label={t('study')}
                    href="/study"
                    isDarkMode={isDarkMode}
                    onClick={() => setIsOpen(false)}
                  />

                  {/* Divider */}
                  <div className={`my-3 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`} />

                  {/* Theme Toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className={`flex items-center justify-between w-full p-4 rounded-xl ${isDarkMode ? 'bg-white/5 active:bg-white/10' : 'bg-black/5 active:bg-black/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {isDarkMode ? <Moon size={22} /> : <Sun size={22} />}
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {isDarkMode ? t('darkMode') : t('lightMode')}
                      </span>
                    </div>
                    <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full shadow"
                        animate={{ x: isDarkMode ? 20 : 0 }}
                      />
                    </div>
                  </button>

                  {/* Language */}
                  <button
                    onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
                    className={`flex items-center justify-between w-full p-4 rounded-xl ${isDarkMode ? 'bg-white/5 active:bg-white/10' : 'bg-black/5 active:bg-black/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Languages size={22} />
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {t('language')}
                      </span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                      }`}>
                      {language === 'en' ? '🇬🇧 EN' : '🇹🇷 TR'}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className={`my-3 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`} />

                  {/* Logout */}
                  {session && (
                    <button
                      onClick={() => signOut()}
                      className={`flex items-center gap-3 w-full p-4 rounded-xl text-red-500 ${isDarkMode ? 'bg-red-500/10 active:bg-red-500/20' : 'bg-red-50 active:bg-red-100'
                        }`}
                    >
                      <LogOut size={22} />
                      <span className="font-medium">{t('logout')}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper component for menu links
function MenuLink({ icon: Icon, label, href, isDarkMode, onClick }: {
  icon: any;
  label: string;
  href: string;
  isDarkMode: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between w-full p-4 rounded-xl ${isDarkMode ? 'bg-white/5 active:bg-white/10' : 'bg-black/5 active:bg-black/10'
        }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={22} className={isDarkMode ? 'text-white' : 'text-black'} />
        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</span>
      </div>
      <ChevronRight size={20} className={isDarkMode ? 'text-white/50' : 'text-black/50'} />
    </Link>
  );
}
