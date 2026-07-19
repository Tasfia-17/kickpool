'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CAT_THEMES, CatTheme } from '@/lib/catThemes';
import { generateAvatar } from '@/lib/catConstants';

interface ThemeContextType {
  currentTheme: CatTheme;
  setTheme: (theme: CatTheme) => void;
  avatar: string; // User's DiceBear avatar
  pokemonSprite: string; // Animated Pokemon GIF URL
  catSprite: string; // Alias for pokemonSprite
  pokemonName: string; // Current theme's Pokemon name
  particleIds: number[]; // Pokemon IDs for floating particle sprites
  setAvatarSeed: (seed: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<CatTheme>(CAT_THEMES[0]);
  const [avatarSeed, setAvatarSeed] = useState<string>('default-cat');
  const [avatar, setAvatar] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load theme, avatar seed, and dark mode from local storage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('cat-theme-id');
    const savedDarkMode = localStorage.getItem('dark-mode');
    const savedAvatarSeed = localStorage.getItem('avatar-seed');

    // Batch state updates to avoid unnecessary re-renders
    let newAvatarSeed = 'default-cat';

    if (savedThemeId) {
      const theme = CAT_THEMES.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }

    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    if (savedAvatarSeed) {
      newAvatarSeed = savedAvatarSeed;
    } else {
      // Generate random seed for new users
      newAvatarSeed = `cat-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('avatar-seed', newAvatarSeed);
    }

    setAvatarSeed(newAvatarSeed);
    // Explicitly set the avatar in the same mount effect to avoid the second effect dependency trigger
    setAvatar(generateAvatar(newAvatarSeed));

    setMounted(true);
  }, []);

  // Sync avatar generation to seed changes going forward (but skipping the double mount issue)
  useEffect(() => {
    if (mounted) {
      setAvatar(generateAvatar(avatarSeed));
    }
  }, [avatarSeed, mounted]);

  // Save theme to local storage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('cat-theme-id', currentTheme.id);
    }
    // Update CSS variable for dark mode background
    if (currentTheme.colors.darkBackground) {
      document.documentElement.style.setProperty('--dark-bg', currentTheme.colors.darkBackground);
    }
  }, [currentTheme, mounted]);

  // Handle Dark Mode Toggle
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('dark-mode', String(newMode));

    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setTheme = (theme: CatTheme) => {
    setCurrentTheme(theme);
  };

  const updateAvatarSeed = (seed: string) => {
    setAvatarSeed(seed);
    localStorage.setItem('avatar-seed', seed);
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme,
      avatar,
      pokemonSprite: currentTheme.sprite, // Animated Pokemon GIF
      catSprite: currentTheme.sprite, // Alias
      pokemonName: currentTheme.pokemonName || currentTheme.name,
      particleIds: currentTheme.particleIds || [25, 1, 7, 4, 133],
      setAvatarSeed: updateAvatarSeed,
      isDarkMode,
      toggleDarkMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Backwards compatibility exports - will work with existing code
export { ThemeProvider as PokemonThemeProvider };
export { useTheme as usePokemonTheme };
