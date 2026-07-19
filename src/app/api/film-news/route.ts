import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

export const dynamic = 'force-dynamic';

function buildHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CinePurr/1.0',
  };
  if (key.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${key}`;
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function buildUrl(path: string, key: string, extra = '') {
  if (key.startsWith('eyJ')) return `${TMDB_BASE}${path}?language=en-US${extra}`;
  return `${TMDB_BASE}${path}?api_key=${key}&language=en-US${extra}`;
}

async function tmdbFetch(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TMDB ${res.status}: ${url} - ${text}`);
    }
    return await res.json();
  } catch (error) {
    logger.error('Fetch error:', error);
    throw error;
  }
}

export interface MovieItem {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  releaseDate: string;
  rating: number;
  voteCount: number;
  genres: string[];
}

export async function GET(req: NextRequest) {
  const key = process.env.TMDB_API_KEY || '';
  if (!key) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const tab = req.nextUrl.searchParams.get('tab') || 'trending';
  const headers = buildHeaders(key);

  try {
    let url: string;
    if (tab === 'trending') {
      url = buildUrl('/trending/movie/week', key);
    } else if (tab === 'nowplaying') {
      url = buildUrl('/movie/now_playing', key);
    } else {
      url = buildUrl('/movie/upcoming', key);
    }

    const data = await tmdbFetch(url, headers);

    // Fetch genre list once (cached)
    const genreUrl = buildUrl('/genre/movie/list', key);
    const genreData = await tmdbFetch(genreUrl, headers);
    const genreMap: Record<number, string> = {};
    for (const g of genreData.genres ?? []) genreMap[g.id] = g.name;

    const movies: MovieItem[] = (data.results ?? []).slice(0, 20).map((m: {
      id: number;
      title: string;
      overview: string;
      poster_path: string | null;
      backdrop_path: string | null;
      release_date: string;
      vote_average: number;
      vote_count: number;
      genre_ids: number[];
    }) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      releaseDate: m.release_date,
      rating: Math.round(m.vote_average * 10) / 10,
      voteCount: m.vote_count,
      genres: (m.genre_ids ?? []).slice(0, 2).map((id: number) => genreMap[id] ?? '').filter(Boolean),
    }));

    return NextResponse.json({ movies }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    logger.error('[film-news]', err);
    return NextResponse.json({ error: 'Failed to fetch film news' }, { status: 500 });
  }
}
