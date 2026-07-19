import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import logger from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Convert IMDb ID to TMDB ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imdbId: string }> }
) {
  const resolvedParams = await params;
  const imdbId = resolvedParams.imdbId;

  if (!imdbId || !imdbId.startsWith('tt')) {
    return NextResponse.json({ error: 'Invalid IMDb ID format' }, { status: 400 });
  }

  if (!TMDB_API_KEY) {
    logger.error('TMDB API key not configured');
    return NextResponse.json({ error: 'TMDB API key not configured - please set TMDB_API_KEY env var' }, { status: 500 });
  }

  try {
    logger.info(`TMDB Find request for IMDb ID: ${imdbId}`);

    // Detect if using JWT token (v4 API) or simple key (v3 API)
    const isJWT = TMDB_API_KEY.startsWith('eyJ');

    let response;
    if (isJWT) {
      // Use Bearer token for v4 API (but v3 endpoints still work)
      response = await axios.get(`${TMDB_BASE_URL}/find/${imdbId}?external_source=imdb_id`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Use api_key query parameter for v3 API
      response = await axios.get(`${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`, {
        timeout: 10000,
      });
    }
    logger.info(`TMDB Find response: ${JSON.stringify(response.data).substring(0, 200)}`);

    const data = response.data;

    // Check TV results first
    if (data.tv_results && data.tv_results.length > 0) {
      const tv = data.tv_results[0];
      return NextResponse.json({
        tmdbId: tv.id,
        type: 'tv',
        name: tv.name,
        posterPath: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : null,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800', // Cache for 24h
        },
      });
    }

    // Check movie results
    if (data.movie_results && data.movie_results.length > 0) {
      const movie = data.movie_results[0];
      return NextResponse.json({
        tmdbId: movie.id,
        type: 'movie',
        name: movie.title,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      });
    }

    return NextResponse.json({ error: 'No results found' }, { status: 404 });

  } catch (error: any) {
    const errMsg = error?.response?.data?.status_message || error?.message || 'Unknown error';
    const errCode = error?.response?.status || 500;
    logger.error(`TMDB Find Error: ${errMsg} (code: ${errCode})`);
    return NextResponse.json({
      error: 'Failed to convert IMDb ID',
      details: errMsg,
      code: errCode
    }, { status: 500 });
  }
}
