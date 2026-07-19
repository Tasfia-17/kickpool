"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PixelIcon from '@/components/PixelIcon';

type Badge = {
  id: string;
  title: string;
  description?: string;
  icon?: string; // emoji or URL
  awardedAt: number;
};

type BadgeContextValue = {
  badges: Badge[];
  awardBadge: (id: string, title: string, description?: string, icon?: string) => void;
  hasBadge: (id: string) => boolean;
  newBadge: Badge | null;
  clearNewBadge: () => void;
  isReady: boolean;
};

const BadgeContext = createContext<BadgeContextValue | null>(null);

// User-specific storage key to prevent badge sharing between accounts
const getStorageKey = (username: string | null | undefined) => {
  if (!username) return null;
  return `cinepurr_badges_${username}_v2`;
};

// Achievement Notification Component
function AchievementNotification({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const isUrl = badge.icon?.startsWith('http');

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-4 z-[9999] animate-slide-in-right">
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-1 rounded-lg shadow-2xl">
        <div className="bg-black/90 rounded-lg p-4 min-w-[280px]">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
              {badge.icon ? (
                isUrl ? (
                  <img src={badge.icon} alt={badge.title} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <span className="text-3xl">{badge.icon}</span>
                )
              ) : (
                <span style={{ color: '#fff' }}><PixelIcon name="trophy" size={32} /></span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Achievement Unlocked!</p>
              <h4 className="text-white text-lg font-bold">{badge.title}</h4>
              {badge.description && (
                <p className="text-gray-300 text-sm">{badge.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [mounted, setMounted] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]); // Queue badges that come in before ready
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Get user-specific storage key
  const storageKey = getStorageKey(session?.user?.name);

  // Reset badges when user changes (logout/login)
  useEffect(() => {
    const newUser = session?.user?.name || null;
    if (currentUser !== null && newUser !== currentUser) {
      // User changed - clear badges and reload
      setBadges([]);
      setInitialLoadComplete(false);
    }
    setCurrentUser(newUser);
  }, [session?.user?.name, currentUser]);

  useEffect(() => {
    setMounted(true);

    // Only load badges if we have a user and storage key
    if (status === 'loading') return;

    if (!storageKey) {
      // No user logged in - clear badges
      setBadges([]);
      setInitialLoadComplete(true);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setBadges(Array.isArray(parsed) ? parsed : []);
      } else {
        setBadges([]);
      }
    } catch (e) {
      console.error('Failed to load badges', e);
      setBadges([]);
    }

    // Mark initial load complete immediately, avoiding an artificial setTimeout re-render
    setInitialLoadComplete(true);
  }, [storageKey, status]);

  // Process pending badges once ready
  useEffect(() => {
    if (initialLoadComplete && pendingBadges.length > 0) {
      pendingBadges.forEach(badge => {
        setBadges(prev => {
          if (prev.find(b => b.id === badge.id)) return prev;
          setNewBadge(badge);
          return [...prev, badge];
        });
      });
      setPendingBadges([]);
    }
  }, [initialLoadComplete, pendingBadges]);

  useEffect(() => {
    if (mounted && initialLoadComplete && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(badges));
      } catch (e) {
        console.error('Failed to save badges', e);
      }
    }
  }, [badges, mounted, initialLoadComplete, storageKey]);

  const awardBadge = (id: string, title: string, description?: string, icon?: string) => {
    const badge: Badge = { id, title, description, icon, awardedAt: Date.now() };

    // If not ready yet, queue the badge
    if (!initialLoadComplete) {
      setPendingBadges(prev => {
        if (prev.find(b => b.id === id)) return prev;
        return [...prev, badge];
      });
      return;
    }

    // Check BEFORE calling setBadges to avoid side-effects inside state updater (React anti-pattern)
    const alreadyExists = badges.some(b => b.id === id) || pendingBadges.some(b => b.id === id);
    if (alreadyExists) return;

    // Show notification for new badge (outside state updater — correct pattern)
    setNewBadge(badge);

    setBadges(prev => {
      // Double-guard inside functional update in case of concurrent calls
      if (prev.find(b => b.id === id)) return prev;
      return [...prev, badge];
    });

    // Persist client-side achievements to the server (night-owl, early-bird, konami, theme-explorer)
    const CLIENT_SIDE_IDS = ['night-owl', 'early-bird', 'konami', 'theme-explorer'];
    if (CLIENT_SIDE_IDS.includes(id)) {
      fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId: id }),
      }).catch(() => { /* silently ignore network errors */ });
    }
  };

  const hasBadge = (id: string) => {
    // Check both existing badges and pending badges
    return badges.some(b => b.id === id) || pendingBadges.some(b => b.id === id);
  };

  const clearNewBadge = () => setNewBadge(null);

  return (
    <BadgeContext.Provider value={{ badges, awardBadge, hasBadge, newBadge, clearNewBadge, isReady: initialLoadComplete }}>
      {children}
      {mounted && newBadge && (
        <AchievementNotification badge={newBadge} onClose={clearNewBadge} />
      )}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges must be used within BadgeProvider');
  return ctx;
}
