import { useState, useCallback } from 'react';

export type WindowId = 'xp' | 'minigames' | 'activity' | 'leaderboard' | 'quests' | 'crates' | 'streak' | 'profile' | 'settings' | 'about' | 'privacy' | 'contact' | 'achievements' | 'stats' | 'history' | 'watchlist';

interface WindowState {
  id: WindowId;
  isOpen: boolean;
  zIndex: number;
  isMinimized: boolean;
}

export function useWindowManager() {
  // Track the order of active windows. The last item is "on top".
  const [stack, setStack] = useState<WindowId[]>([]);
  
  // Track visibility state
  const [windows, setWindows] = useState<Record<WindowId, boolean>>({
    xp: false,
    minigames: false,
    activity: false,
    leaderboard: false,
    quests: false,
    crates: false,
    streak: false,
    profile: false,
    settings: false,
    about: false,
    privacy: false,
    contact: false,
    achievements: false,
    stats: false,
    history: false,
    watchlist: false,
  });

  const openWindow = useCallback((id: WindowId) => {
    setWindows(prev => ({ ...prev, [id]: true }));
    // Move to top of stack
    setStack(prev => [...prev.filter(w => w !== id), id]);
  }, []);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows(prev => ({ ...prev, [id]: false }));
    setStack(prev => prev.filter(w => w !== id));
  }, []);

  const focusWindow = useCallback((id: WindowId) => {
    // Only reorder if not already on top
    setStack(prev => {
      if (prev[prev.length - 1] === id) return prev;
      return [...prev.filter(w => w !== id), id];
    });
  }, []);

  const toggleWindow = useCallback((id: WindowId) => {
    setWindows(prev => {
      const isCurrentlyOpen = !!prev[id];
      if (isCurrentlyOpen) {
        // Close window
        setStack(s => s.filter(w => w !== id));
        return { ...prev, [id]: false };
      } else {
        // Open window
        setStack(s => {
          if (s[s.length - 1] === id) return s;
          return [...s.filter(w => w !== id), id];
        });
        return { ...prev, [id]: true };
      }
    });
  }, []);

  // Helper to get z-index for a specific window
  const getZIndex = useCallback((id: WindowId) => {
    const index = stack.indexOf(id);
    return index === -1 ? 1 : 1000 + index; // Base z-index 1000
  }, [stack]);

  return {
    windows,
    openWindow,
    closeWindow,
    toggleWindow,
    focusWindow,
    getZIndex,
    activeWindow: stack[stack.length - 1] || null
  };
}

