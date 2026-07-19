'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Film, TrendingUp, Clock, Calendar, Star, ArrowLeft, ExternalLink, RefreshCw, Play, Bookmark, BookmarkCheck } from 'lucide-react';
import type { MovieItem } from '@/app/api/film-news/route';

const TABS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'nowplaying', label: 'Now Playing', icon: Clock },
  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
] as const;

type Tab = typeof TABS[number]['id'];

export default function NewsPage() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('trending');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [watchingId, setWatchingId] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Fetch user's watchlist on mount
  useEffect(() => {
    if (!session) return;
    fetch('/api/watchlist')
      .then(r => r.ok ? r.json() : [])
      .then((items: Array<{ tmdbId: number; tmdbType: string }>) => {
        setBookmarked(new Set(items.map(i => `${i.tmdbId}-${i.tmdbType}`)));
      })
      .catch(() => { /* ignore */ });
  }, [session]);

  const toggleWatchlist = async (movie: MovieItem) => {
    if (!session) { router.push('/login?redirect=/news'); return; }
    const key = `${movie.id}-movie`;
    if (bookmarked.has(key)) {
      await fetch(`/api/watchlist?tmdbId=${movie.id}&tmdbType=movie`, { method: 'DELETE' });
      setBookmarked(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: movie.id, tmdbType: 'movie', title: movie.title, poster: movie.poster }),
      });
      setBookmarked(prev => new Set(prev).add(key));
    }
  };

  const startWatchParty = async (movie: MovieItem) => {
    if (!session) {
      router.push('/login?redirect=/news');
      return;
    }
    setWatchingId(movie.id);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: movie.title, isPublic: true, maxUsers: 20 }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      router.push(`/room/${data.roomId}`);
    } catch {
      setWatchingId(null);
    }
  };

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/film-news?tab=${t}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setMovies(data.movies ?? []);
    } catch {
      setError('Could not load film news. Make sure TMDB_API_KEY is configured.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [load, tab]);

  const bg = isDarkMode ? currentTheme.colors.darkBackground : 'white';
  const page = isDarkMode ? '#0f0f1a' : currentTheme.colors.background;

  return (
    <main className="min-h-screen" style={{ backgroundColor: page }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b-4 border-black dark:border-white px-4 sm:px-8 py-3 flex items-center gap-4"
        style={{ backgroundColor: bg }}
      >
        <Link
          href="/"
          className="p-2 border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <Film size={22} style={{ color: currentTheme.colors.primary }} />
        <h1 className="font-black text-xl uppercase tracking-wide">Film News</h1>
        <span className="text-xs font-mono text-gray-400 ml-1">via TMDB</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelected(null); }}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-sm border-2 border-black dark:border-white transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] dark:shadow-[3px_3px_0_rgba(255,255,255,0.5)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,1)]`}
              style={{
                backgroundColor: tab === id ? currentTheme.colors.primary : bg,
                color: tab === id ? 'white' : undefined,
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
          <button
            onClick={() => load(tab)}
            className="ml-auto p-2 border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div
            className="mb-6 border-4 border-black dark:border-white shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,0.3)] overflow-hidden"
            style={{ backgroundColor: bg }}
          >
            {selected.backdrop && (
              <div className="relative w-full h-48 sm:h-64">
                <Image
                  src={selected.backdrop}
                  alt={selected.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="font-black text-2xl sm:text-3xl leading-tight">{selected.title}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {selected.genres.map(g => (
                  <span key={g} className="text-xs font-bold px-2 py-0.5 text-white" style={{ backgroundColor: currentTheme.colors.primary }}>
                    {g}
                  </span>
                ))}
                <span className="text-xs font-mono text-gray-500">{selected.releaseDate}</span>
                <span className="text-xs font-bold flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  {selected.rating} ({selected.voteCount.toLocaleString()} votes)
                </span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
                {selected.overview || 'No overview available.'}
              </p>
              <a
                href={`https://www.themoviedb.org/movie/${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-[3px_3px_0_rgba(0,0,0,1)]"
              >
                <ExternalLink size={14} /> View on TMDB
              </a>
              <button
                onClick={() => toggleWatchlist(selected)}
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white font-bold text-sm transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,1)] ${
                  bookmarked.has(`${selected.id}-movie`)
                    ? 'bg-yellow-400 text-black'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={bookmarked.has(`${selected.id}-movie`) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {bookmarked.has(`${selected.id}-movie`)
                  ? <><BookmarkCheck size={14} /> Saved</>
                  : <><Bookmark size={14} /> Add to Watchlist</>}
              </button>
              <button
                onClick={() => startWatchParty(selected)}
                disabled={watchingId === selected.id}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white font-bold text-sm text-white transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                {watchingId === selected.id ? (
                  <><RefreshCw size={14} className="animate-spin" /> Starting…</>
                ) : (
                  <><Play size={14} /> 🎬 Watch Together</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {error ? (
          <div className="text-center py-16 text-gray-500 font-mono text-sm">{error}</div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="border-4 border-black dark:border-white animate-pulse"
                style={{ backgroundColor: bg }}
              >
                <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {movies.map((movie) => (
              <button
                key={movie.id}
                onClick={() => setSelected(movie)}
                className="border-4 border-black dark:border-white text-left overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0_rgba(255,255,255,0.4)] shadow-[3px_3px_0_rgba(0,0,0,1)] dark:shadow-[3px_3px_0_rgba(255,255,255,0.2)]"
                style={{ backgroundColor: bg }}
              >
                <div className="aspect-[2/3] overflow-hidden bg-gray-200 dark:bg-gray-800 relative">
                  {movie.poster ? (
                    <Image
                      src={movie.poster}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={40} className="text-gray-400" />
                    </div>
                  )}
                  {/* Rating badge */}
                  <div
                    className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 text-white text-xs font-black shadow"
                    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                  >
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    {movie.rating}
                  </div>
                  {/* Watch Together hover overlay */}
                  <div className="absolute inset-0 bg-black/60 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startWatchParty(movie); }}
                      disabled={watchingId === movie.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-white font-bold text-sm text-white disabled:opacity-60 hover:bg-white/20 transition-colors"
                      style={{ backgroundColor: watchingId === movie.id ? 'rgba(255,255,255,0.1)' : `${currentTheme.colors.primary}cc` }}
                    >
                      {watchingId === movie.id
                        ? <><RefreshCw size={13} className="animate-spin" /> Starting…</>
                        : <><Play size={13} /> Watch Together</>}
                    </button>
                  </div>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="font-black text-xs sm:text-sm leading-tight line-clamp-2 mb-1">{movie.title}</p>
                  <p className="text-xs text-gray-500 font-mono">{movie.releaseDate?.slice(0, 4)}</p>
                  {movie.genres.length > 0 && (
                    <p className="text-xs mt-1 font-bold truncate" style={{ color: currentTheme.colors.primary }}>
                      {movie.genres.join(' · ')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 font-mono mt-8">
          Data from{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
            The Movie Database (TMDB)
          </a>
          . Not affiliated with CinePurr.
        </p>
      </div>
    </main>
  );
}
