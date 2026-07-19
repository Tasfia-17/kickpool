'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Bookmark, Trash2, RefreshCw, Film, Tv, Play } from 'lucide-react';

interface WatchlistItem {
  id: string;
  tmdbId: number;
  tmdbType: string;
  title: string;
  poster?: string;
  year?: string;
  addedAt: string;
}

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w185';

export function WatchlistWindow() {
  const { data: session, status } = useSession();
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchList();
  }, [status, fetchList]);

  const remove = async (tmdbId: number, tmdbType: string) => {
    try {
      await fetch(`/api/watchlist?tmdbId=${tmdbId}&tmdbType=${tmdbType}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => !(i.tmdbId === tmdbId && i.tmdbType === tmdbType)));
    } catch {
      // fail silently
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center p-10 gap-3 text-center">
        <Bookmark size={40} style={{ color: currentTheme.colors.primary }} className="opacity-60" />
        <p className={`text-sm font-bold ${isDarkMode ? 'text-white/60' : 'text-black/50'}`}>
          Sign in to save your watchlist
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="w-8 h-8 border-4 border-t-pink-500 border-pink-500/20 rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.tmdbType === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 shrink-0 gap-2"
        style={{
          borderColor: isDarkMode ? '#374151' : '#d1d5db',
          backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        }}
      >
        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'movie', 'tv'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-2 py-0.5 text-[10px] font-bold border-2 transition-all"
              style={{
                borderColor: filter === tab ? currentTheme.colors.primary : (isDarkMode ? '#374151' : '#d1d5db'),
                backgroundColor: filter === tab ? currentTheme.colors.primary : 'transparent',
                color: filter === tab ? 'white' : (isDarkMode ? '#9ca3af' : '#6b7280'),
              }}
            >
              {tab === 'all' ? 'All' : tab === 'movie' ? '🎬 Movies' : '📺 Shows'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
            {filtered.length}
          </span>
          <button
            onClick={fetchList}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} style={{ color: currentTheme.colors.primary }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3 text-center h-full">
            <Bookmark size={44} style={{ color: currentTheme.colors.primary }} className="opacity-30" />
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
              {filter === 'all' ? 'Your watchlist is empty' : `No ${filter === 'movie' ? 'movies' : 'shows'} saved`}
            </p>
            <p className={`text-xs max-w-[200px] ${isDarkMode ? 'text-white/25' : 'text-black/25'}`}>
              Bookmark movies and shows from the room search to add them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col border-2 overflow-hidden group"
                style={{
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                }}
              >
                {/* Poster */}
                <div
                  className="relative w-full aspect-[2/3] flex items-center justify-center"
                  style={{ backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }}
                >
                  {item.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${TMDB_IMAGE}${item.poster}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-4 text-center">
                      {item.tmdbType === 'tv' ? (
                        <Tv size={28} style={{ color: currentTheme.colors.primary }} className="opacity-60" />
                      ) : (
                        <Film size={28} style={{ color: currentTheme.colors.primary }} className="opacity-60" />
                      )}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play
                      size={32}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                    />
                  </div>

                  {/* Type badge */}
                  <div
                    className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 text-white"
                    style={{ backgroundColor: item.tmdbType === 'tv' ? '#3b82f6' : '#8b5cf6' }}
                  >
                    {item.tmdbType === 'tv' ? 'TV' : 'FILM'}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => remove(item.tmdbId, item.tmdbType)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Remove"
                  >
                    <Trash2 size={10} className="text-white" />
                  </button>
                </div>

                {/* Title + year */}
                <div className="p-1.5">
                  <p className={`text-[11px] font-bold line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  {item.year && (
                    <p className={`text-[10px] ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>{item.year}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
