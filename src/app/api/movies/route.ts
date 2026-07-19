import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Movie/TV provider configuration (can be moved to DB or remote config)
const MOVIE_PROVIDERS = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    quality: '720p',
    embedUrl: (imdbId: string, type: 'movie' | 'tv', season?: number, episode?: number) => {
      if (type === 'tv' && season && episode) {
        return `https://vidsrc.xyz/embed/tv/${imdbId}/${season}/${episode}`;
      }
      return type === 'tv'
        ? `https://vidsrc.xyz/embed/tv/${imdbId}`
        : `https://vidsrc.xyz/embed/movie/${imdbId}`;
    },
    priority: 1,
  },
  {
    id: '2embed',
    name: '2Embed',
    quality: '1080p',
    embedUrl: (imdbId: string) => `https://www.2embed.cc/embed/${imdbId}`,
    priority: 2,
  },
  {
    id: 'vidbinge',
    name: 'VidBinge',
    quality: '1080p',
    embedUrl: (imdbId: string, type: 'movie' | 'tv') => {
      return type === 'tv'
        ? `https://vidbinge.dev/embed/tv/${imdbId}`
        : `https://vidbinge.dev/embed/movie/${imdbId}`;
    },
    priority: 3,
  },
  {
    id: 'smashystream',
    name: 'Smashystream',
    quality: '720p-1080p',
    embedUrl: (imdbId: string, type: 'movie' | 'tv') => {
      return type === 'tv'
        ? `https://player.smashy.stream/tv/${imdbId}`
        : `https://player.smashy.stream/movie/${imdbId}`;
    },
    priority: 4,
  },
  {
    id: 'vidsrcto',
    name: 'VidSrc.to',
    quality: '720p',
    embedUrl: (imdbId: string, type: 'movie' | 'tv') => {
      return type === 'tv'
        ? `https://vidsrc.to/embed/tv/${imdbId}`
        : `https://vidsrc.to/embed/movie/${imdbId}`;
    },
    priority: 5,
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    quality: '1080p+',
    embedUrl: (imdbId: string, type: 'movie' | 'tv') => {
      return type === 'tv'
        ? `https://multiembed.mov/embed/tv/${imdbId}`
        : `https://multiembed.mov/embed/movie/${imdbId}`;
    },
    priority: 6,
  },
  {
    id: 'nontongo',
    name: 'NontonGo',
    quality: '480p-720p',
    embedUrl: (imdbId: string, type: 'movie' | 'tv') => {
      return type === 'tv'
        ? `https://www.NontonGo.win/embed/tv/${imdbId}`
        : `https://www.NontonGo.win/embed/movie/${imdbId}`;
    },
    priority: 7,
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    logger.info(`Movie search request: ${query}`);

    // Use OMDb API with secure server-side key
    const API_KEY = process.env.OMDB_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const omdbUrl = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`;

    const response = await fetch(omdbUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OMDb API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.Response === 'True' && data.Search) {
      const results: any[] = [];

      // Get the best provider (first one, highest priority)
      const bestProvider = MOVIE_PROVIDERS[0];

      // For each movie/show, create ONE result using the best provider
      data.Search.forEach((item: any) => {
        const imdbId = item.imdbID;
        const poster = item.Poster !== 'N/A' ? item.Poster : null;
        const isTV = item.Type === 'series';

        results.push({
          id: imdbId, // Use clean IMDb ID
          title: item.Title,
          originalTitle: item.Title,
          thumbnail: poster,
          year: item.Year,
          rating: item.Type === 'series' ? '📺 TV Series' : '🎬 Movie',
          overview: `${item.Year} • ${item.Type === 'series' ? 'TV Series' : 'Movie'}`,
          url: bestProvider.embedUrl(imdbId, isTV ? 'tv' : 'movie'),
          type: isTV ? 'tv' : 'movie',
          provider: 'movie',
          imdbId,
          numberOfSeasons: isTV ? 10 : undefined, // Fallback, real data fetched from TMDB
        });
      });

      return NextResponse.json(results, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json([], {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    logger.error('Movie search error:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

