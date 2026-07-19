'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, TrendingUp, Star, ChevronRight } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import type { MovieItem } from '@/app/api/film-news/route';

/**
 * Compact film news widget for the home page.
 * Shows 6 trending movies in a horizontal scroll strip.
 */
export function FilmNewsWidget() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/film-news?tab=trending')
      .then(r => r.json())
      .then(d => { if (!cancelled) setMovies((d.movies ?? []).slice(0, 8)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const bg = isDarkMode ? currentTheme.colors.darkBackground : 'white';

  if (!loading && movies.length === 0) return null;

  return (
    <div
      className="border-4 border-black dark:border-white shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,0.2)] overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b-4 border-black dark:border-white"
        style={{ background: `linear-gradient(135deg, #111 0%, ${currentTheme.colors.primary}44 100%)` }}
      >
        <span className="font-mono font-bold text-white flex items-center gap-2 text-sm">
          <TrendingUp size={14} style={{ color: currentTheme.colors.primary }} />
          TRENDING FILMS
        </span>
        <Link
          href="/news"
          className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1 transition-colors"
        >
          See all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 p-3 overflow-x-auto pixel-scrollbar">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-24 animate-pulse">
                <div className="w-24 h-36 bg-gray-200 dark:bg-gray-700 border-2 border-black dark:border-white" />
                <div className="mt-1.5 h-2.5 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))
          : movies.map((m) => (
              <Link
                key={m.id}
                href="/news"
                className="shrink-0 w-24 group"
                title={m.title}
              >
                <div className="w-24 h-36 overflow-hidden border-2 border-black dark:border-white bg-gray-200 dark:bg-gray-800 relative">
                  {m.poster ? (
                    <Image
                      src={m.poster}
                      alt={m.title}
                      fill
                      sizes="96px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={28} className="text-gray-400" />
                    </div>
                  )}
                  {/* Rating */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-0.5 px-1 py-0.5 bg-black/70 text-white text-[10px] font-bold">
                    <Star size={8} className="text-yellow-400 fill-yellow-400 shrink-0" />
                    {m.rating}
                  </div>
                </div>
                <p className="mt-1 text-[10px] font-bold leading-tight line-clamp-2 group-hover:opacity-70 transition-opacity">
                  {m.title}
                </p>
              </Link>
            ))}
      </div>
    </div>
  );
}
