import { NextResponse } from 'next/server';
import axios from 'axios';
import logger from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Get TV show details with seasons
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const tvId = resolvedParams.id;
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season');

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
  }

  // Detect if using JWT token (v4 API) or simple key (v3 API)
  const isJWT = TMDB_API_KEY.startsWith('eyJ');
  const headers = isJWT ? { 'Authorization': `Bearer ${TMDB_API_KEY}`, 'Content-Type': 'application/json' } : {};

  try {
    // If season is specified, get episode list for that season
    if (season) {
      const url = isJWT
        ? `${TMDB_BASE_URL}/tv/${tvId}/season/${season}?language=en-US`
        : `${TMDB_BASE_URL}/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`;
      const seasonData = await axios.get(url, {
        timeout: 10000,
        headers,
      });

      const episodes = seasonData.data.episodes?.map((ep: any) => ({
        episodeNumber: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        airDate: ep.air_date,
        stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
        runtime: ep.runtime,
        voteAverage: ep.vote_average?.toFixed(1),
      })) || [];

      return NextResponse.json({
        seasonNumber: parseInt(season),
        name: seasonData.data.name,
        overview: seasonData.data.overview,
        episodes,
      });
    }

    // Otherwise get TV show details with all seasons info
    const tvUrl = isJWT
      ? `${TMDB_BASE_URL}/tv/${tvId}?language=en-US`
      : `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
    const tvData = await axios.get(tvUrl, {
      timeout: 10000,
      headers,
    });

    const seasons = tvData.data.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => ({
      seasonNumber: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
      airDate: s.air_date,
      posterPath: s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : null,
    })) || [];

    return NextResponse.json({
      id: tvData.data.id,
      name: tvData.data.name,
      overview: tvData.data.overview,
      posterPath: tvData.data.poster_path ? `https://image.tmdb.org/t/p/w500${tvData.data.poster_path}` : null,
      numberOfSeasons: tvData.data.number_of_seasons,
      seasons,
      inProduction: tvData.data.in_production,
      status: tvData.data.status,
    });
  } catch (error: any) {
    logger.error('TV API Error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch TV show data' }, { status: 500 });
  }
}
