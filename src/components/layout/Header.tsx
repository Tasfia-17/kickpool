'use client';

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import Logo from '@/components/Logo';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

export default function Header() {
  const { currentTheme, isDarkMode } = usePokemonTheme();

  return (
    <header
      className={`h-16 sticky top-0 z-50 border-b-4 flex items-center justify-between px-4 sm:px-6 shrink-0 ${isDarkMode ? 'border-pink-500/50 bg-black/90' : 'border-black bg-white/95'} backdrop-blur-sm`}
      style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)', borderTopWidth: '3px', borderTopColor: currentTheme?.colors?.primary || '#FD79A8' }}
    >
      <Logo size="md" />

      {/* Back to Home */}
      <Link
        href="/"
        className={`flex items-center gap-2 px-3 py-2 border-2 font-bold text-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] ${isDarkMode
          ? 'border-pink-500 bg-pink-500/20 text-pink-400 hover:shadow-[4px_4px_0px_0px_rgba(236,72,153,0.5)]'
          : 'border-black bg-pink-100 text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
      >
        <Home size={16} /> Home
      </Link>
    </header>
  );
}
