
import { NextResponse } from 'next/server';
import YouTube from 'youtube-sr';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import dns from 'dns';
import logger from '@/lib/logger';

// Force Node to use Google DNS for external requests
dns.setDefaultResultOrder('ipv4first');

// TMDB API for movie search
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// YouTube Data API v3 - Official Google API (most reliable fallback)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

// Popular movie embed sources - supports season/episode for TV
const getMovieEmbedUrl = (tmdbId: number, type: 'movie' | 'tv' = 'movie', season?: number, episode?: number) => {
  if (type === 'tv' && season && episode) {
    return `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;
  }
  return `https://vidsrc.cc/v2/embed/${type}/${tmdbId}`;
};

const getMovieEmbedUrl2 = (tmdbId: number, type: 'movie' | 'tv' = 'movie', season?: number, episode?: number) => {
  if (type === 'tv' && season && episode) {
    return `https://vidbinge.dev/embed/tv/${tmdbId}/${season}/${episode}`;
  }
  return `https://vidbinge.dev/embed/${type}/${tmdbId}`;
};

const getMovieEmbedUrl3 = (tmdbId: number, type: 'movie' | 'tv' = 'movie', season?: number, episode?: number) => {
  if (type === 'tv' && season && episode) {
    return `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
  }
  return `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;
};

const getMovieEmbedUrl4 = (tmdbId: number, type: 'movie' | 'tv' = 'movie', season?: number, episode?: number) => {
  if (type === 'tv' && season && episode) {
    return `https://2embed.cc/embed/tv/${tmdbId}/${season}/${episode}`;
  }
  return `https://2embed.cc/embed/movie/${tmdbId}`;
};

// Create axios instance without proxy
const tmdbAxios = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${TMDB_API_KEY}`,
    'Content-Type': 'application/json',
  },
  proxy: false, // Disable proxy
});

// TMDB Fetch with axios
const tmdbFetch = async (endpoint: string): Promise<any> => {
  const url = `${TMDB_BASE_URL}${endpoint}`;
  logger.debug('TMDB Fetch URL:', url);
  try {
    const response = await tmdbAxios.get(endpoint);
    logger.debug('TMDB Response status:', response.status);
    return response.data;
  } catch (error: any) {
    logger.error('TMDB Request Error:', error?.message || error);
    return { results: [] };
  }
};

import { SEARCH_CACHE } from '@/lib/cache';
import { checkRateLimit } from '@/lib/security';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
const SEARCH_CACHE_TTL = 30; // 30s (Redis TTL)

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = searchParams.get('q');
    const type = searchParams.get('type');

    // Rate limiting - max 30 searches per minute per IP
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `search:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many search requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Decode the query in case it's double-encoded
    try {
      query = decodeURIComponent(query);
    } catch (e) {
      // If decoding fails, use original query
      logger.warn('Failed to decode query, using original:', query);
    }

    // Trim and clean the query
    query = query.trim();

    // Validate query length
    if (query.length === 0) {
      return NextResponse.json({ error: 'Query cannot be empty' }, { status: 400 });
    }

    if (query.length > 200) {
      return NextResponse.json({ error: 'Query is too long (max 200 characters)' }, { status: 400 });
    }

    // Validate search type
    const validTypes = ['users', 'rooms', 'movies', 'tv', 'music', 'anime', 'livetv', 'youtube', null];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
    }

    // Parse pagination
    const { skip, take } = parsePaginationParams(searchParams);

    const cacheKey = `search:${type || 'default'}:${query}`;

    // Add timeout for cache operations to prevent hanging
    let cached;
    try {
      const cachePromise = SEARCH_CACHE.get(cacheKey);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cache timeout')), 2000)
      );
      cached = await Promise.race([cachePromise, timeoutPromise]);
    } catch (cacheError) {
      logger.warn('Cache get failed or timed out, continuing without cache:', cacheError);
      cached = undefined;
    }

    if (cached) {
      logger.debug(`Search cache hit for ${cacheKey}`);
      return NextResponse.json(cached);
    }

    // User search
    if (type === 'users') {
      try {
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where: {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            select: {
              id: true,
              username: true,
              image: true,
              isVIP: true,
              isFounder: true,
            },
            skip,
            take,
            orderBy: { username: 'asc' }
          }),
          prisma.user.count({
            where: {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            }
          })
        ]);

        const { page } = parsePaginationParams(searchParams);
        const result = createPaginationResponse(users, total, page, take);

        // Cache the result
        SEARCH_CACHE.set(cacheKey, result, SEARCH_CACHE_TTL).catch(() => { });

        return NextResponse.json(result);
      } catch (error) {
        logger.error('User search error:', error);
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
      }
    }

    // Movie/TV search
    if (type === 'movies') {
      logger.debug('Searching movies for:', query);

      // Check if TMDB API key is set
      if (!TMDB_API_KEY) {
        logger.warn('TMDB API Key is not set!');
        return NextResponse.json({ error: 'TMDB API key not configured. Please add TMDB_API_KEY to .env file.' }, { status: 500 });
      }

      try {
        // Search TMDB for movies and TV shows
        const [movieData, tvData] = await Promise.all([
          tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=en-US`),
          tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&language=en-US`)
        ]);

        const movies = (movieData.results || []).slice(0, 10).map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          thumbnail: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
          year: movie.release_date?.split('-')[0] || 'N/A',
          rating: movie.vote_average?.toFixed(1) || 'N/A',
          url: getMovieEmbedUrl(movie.id, 'movie'),
          url2: getMovieEmbedUrl2(movie.id, 'movie'),
          url3: getMovieEmbedUrl3(movie.id, 'movie'),
          url4: getMovieEmbedUrl4(movie.id, 'movie'),
          type: 'movie',
          provider: 'movie'
        }));

        // For TV shows, also include season count for UI
        const tvShows = await Promise.all(
          (tvData.results || []).slice(0, 10).map(async (tv: any) => {
            // Get TV show details to know number of seasons
            let numberOfSeasons = 1;
            try {
              const tvDetails = await tmdbFetch(`/tv/${tv.id}?language=en-US`);
              numberOfSeasons = tvDetails.number_of_seasons || 1;
            } catch (e) {
              logger.debug('Could not fetch TV details for:', tv.name);
            }

            return {
              id: tv.id,
              title: tv.name,
              originalTitle: tv.original_name,
              thumbnail: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : null,
              backdrop: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : null,
              year: tv.first_air_date?.split('-')[0] || 'N/A',
              rating: tv.vote_average?.toFixed(1) || 'N/A',
              overview: tv.overview,
              url: getMovieEmbedUrl(tv.id, 'tv', 1, 1), // Default to S1E1
              url2: getMovieEmbedUrl2(tv.id, 'tv', 1, 1),
              url3: getMovieEmbedUrl3(tv.id, 'tv', 1, 1),
              url4: getMovieEmbedUrl4(tv.id, 'tv', 1, 1),
              type: 'tv',
              provider: 'movie',
              numberOfSeasons,
              tmdbId: tv.id // Keep for episode selection
            };
          })
        );

        // Combine and sort by popularity
        const results = [...movies, ...tvShows].sort((a, b) =>
          parseFloat(b.rating) - parseFloat(a.rating)
        );

        await SEARCH_CACHE.set(cacheKey, results, 30);
        return NextResponse.json(results, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      } catch (error: any) {
        logger.error('Movie search error:', error);
        return NextResponse.json({ error: 'Failed to search movies' }, { status: 500 });
      }
    }

    // Anime search — uses Jikan API (MyAnimeList) for reliable, free anime search
    if (type === 'anime') {
      logger.debug('Searching anime for:', query);

      try {
        // Use Jikan v4 API — free, no API key needed, backed by MyAnimeList
        const jikanRes = await axios.get(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true&order_by=popularity&sort=asc`,
          { timeout: 10000, proxy: false }
        );

        const animeResults = jikanRes.data?.data || [];

        if (animeResults.length === 0) {
          await SEARCH_CACHE.set(cacheKey, [], 60);
          return NextResponse.json([]);
        }

        // Map Jikan results to our format
        // Try to find TMDB ID for each anime for better embed support
        const results = await Promise.all(
          animeResults.slice(0, 15).map(async (anime: any) => {
            const title = anime.title_english || anime.title || '';
            const originalTitle = anime.title_japanese || anime.title || '';
            const malId = anime.mal_id;
            const isMovie = anime.type === 'Movie';
            const mediaType = isMovie ? 'movie' : 'tv';

            // Try to find TMDB ID via TMDB search (if TMDB key is available)
            let tmdbId: number | null = null;
            let numberOfSeasons = 1;

            if (TMDB_API_KEY) {
              try {
                const searchEndpoint = isMovie
                  ? `/search/movie?query=${encodeURIComponent(title)}&language=en-US`
                  : `/search/tv?query=${encodeURIComponent(title)}&language=en-US`;
                const tmdbData = await tmdbFetch(searchEndpoint);
                const bestMatch = (tmdbData.results || []).find((r: any) =>
                  r.original_language === 'ja' && r.genre_ids?.includes(16)
                ) || (tmdbData.results || [])[0];

                if (bestMatch) {
                  tmdbId = bestMatch.id;
                  if (!isMovie && tmdbId) {
                    try {
                      const tvDetails = await tmdbFetch(`/tv/${tmdbId}?language=en-US`);
                      numberOfSeasons = tvDetails.number_of_seasons || 1;
                    } catch (e) { }
                  }
                }
              } catch (e) {
                logger.debug('TMDB lookup failed for anime:', title);
              }
            }

            // Build embed URL - use TMDB ID if found, otherwise use title-based search
            let embedUrl: string;
            let embedUrl2: string;
            let embedUrl3: string = '';
            let embedUrl4: string = '';

            if (tmdbId) {
              embedUrl = getMovieEmbedUrl(tmdbId, mediaType, isMovie ? undefined : 1, isMovie ? undefined : 1);
              embedUrl2 = getMovieEmbedUrl2(tmdbId, mediaType, isMovie ? undefined : 1, isMovie ? undefined : 1);
              embedUrl3 = getMovieEmbedUrl3(tmdbId, mediaType, isMovie ? undefined : 1, isMovie ? undefined : 1);
              embedUrl4 = getMovieEmbedUrl4(tmdbId, mediaType, isMovie ? undefined : 1, isMovie ? undefined : 1);
            } else {
              // Fallback: use vidsrc search by title
              const searchTitle = encodeURIComponent(title);
              embedUrl = `https://vidsrc.cc/v2/embed/${mediaType}/${searchTitle}`;
              embedUrl2 = `https://vidbinge.dev/embed/${mediaType}/${searchTitle}`;
            }

            return {
              id: String(malId),
              title: title,
              originalTitle: originalTitle,
              thumbnail: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
              backdrop: anime.images?.webp?.large_image_url || null,
              year: anime.year || anime.aired?.prop?.from?.year || 'N/A',
              rating: anime.score ? String(anime.score) : 'N/A',
              overview: anime.synopsis || '',
              url: embedUrl,
              url2: embedUrl2,
              url3: embedUrl3,
              url4: embedUrl4,
              type: mediaType,
              provider: 'movie',
              numberOfSeasons: isMovie ? undefined : numberOfSeasons,
              tmdbId: tmdbId || undefined,
              isAnime: true,
              episodes: anime.episodes || undefined,
              status: anime.status || undefined
            };
          })
        );

        await SEARCH_CACHE.set(cacheKey, results, 60);
        return NextResponse.json(results);
      } catch (error: any) {
        logger.error('Anime search error:', error?.message || error);
        return NextResponse.json({ error: 'Failed to search anime' }, { status: 500 });
      }
    }

    // Live TV search
    if (type === 'livetv') {
      logger.debug('Searching Live TV for:', query);
      try {
        // Fetch channels and streams from iptv-org
        const [channelsRes, streamsRes] = await Promise.all([
          axios.get('https://iptv-org.github.io/api/channels.json'),
          axios.get('https://iptv-org.github.io/api/streams.json')
        ]);

        const channels = channelsRes.data;
        const streams = streamsRes.data;

        // Create a map of streams by channel id — prefer HTTPS streams
        const streamMap = new Map();
        const streamDataMap = new Map();
        streams.forEach((s: any) => {
          if (!s.url || !s.channel) return;
          const existing = streamMap.get(s.channel);
          // Prefer HTTPS streams over HTTP
          if (!existing) {
            streamMap.set(s.channel, s.url);
            streamDataMap.set(s.channel, s);
          } else if (s.url.startsWith('https://') && !existing.startsWith('https://')) {
            streamMap.set(s.channel, s.url);
            streamDataMap.set(s.channel, s);
          }
        });

        // Search in channels
        const queryLower = query.toLowerCase();
        const results = channels
          .filter((c: any) =>
            (c.name.toLowerCase().includes(queryLower) ||
              c.id.toLowerCase().includes(queryLower)) &&
            streamMap.has(c.id)
          )
          .slice(0, 20)
          .map((c: any) => {
            const stream = streamDataMap.get(c.id);
            const rawUrl = streamMap.get(c.id);
            // Proxy HTTP streams through our server to avoid mixed-content/CSP blocks
            const streamUrl = rawUrl.startsWith('http://') 
              ? `/api/iptv-proxy?url=${encodeURIComponent(rawUrl)}${stream?.user_agent ? `&ua=${encodeURIComponent(stream.user_agent)}` : ''}${stream?.referrer ? `&referer=${encodeURIComponent(stream.referrer)}` : ''}`
              : rawUrl;
            return {
              id: c.id,
              title: c.name,
              thumbnail: c.logo || null,
              url: streamUrl,
              provider: 'iptv',
              type: 'livetv',
              country: c.country,
              categories: c.categories || [],
              isLive: true,
              userAgent: stream?.user_agent || null,
              referrer: stream?.referrer || null
            };
          });

        await SEARCH_CACHE.set(cacheKey, results, 300); // Cache for 5 mins
        return NextResponse.json(results);
      } catch (error) {
        logger.error('Live TV search error:', error);
        return NextResponse.json({ error: 'Failed to search Live TV' }, { status: 500 });
      }
    }

    // YouTube search (default)
    // Try YouTube Data API v3 first (most reliable), then fallback to youtube-sr
    if (YOUTUBE_API_KEY) {
      try {
        logger.info(`Trying YouTube Data API v3 for query: "${query}"`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const videoIds = data.items?.map((item: any) => item.id.videoId).filter(Boolean).join(',');

          if (videoIds) {
            // Get video details for duration
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
            const detailsResponse = await fetch(detailsUrl, {
              signal: controller.signal,
              headers: { 'Accept': 'application/json' },
            });

            const durations: Record<string, string> = {};
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              detailsData.items?.forEach((item: any) => {
                if (item.contentDetails?.duration) {
                  durations[item.id] = item.contentDetails.duration;
                }
              });
            }

            const results = data.items.map((item: any) => {
              const videoId = item.id.videoId;
              const duration = durations[videoId] || '';
              // Parse ISO 8601 duration (PT1H2M10S -> 1:02:10)
              let formattedDuration = '0:00';
              if (duration) {
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                  const hours = parseInt(match[1] || '0');
                  const minutes = parseInt(match[2] || '0');
                  const seconds = parseInt(match[3] || '0');
                  if (hours > 0) {
                    formattedDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                  } else {
                    formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  }
                }
              }

              return {
                id: videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
                duration: formattedDuration,
                channel: item.snippet.channelTitle || 'Unknown',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                provider: 'youtube'
              };
            });

            // Cache results
            try {
              await Promise.race([
                SEARCH_CACHE.set(cacheKey, results, 30),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 2000))
              ]);
            } catch (cacheError) {
              logger.warn('Cache set failed, but continuing:', cacheError);
            }

            logger.info(`YouTube Data API v3 returned ${results.length} results for query: "${query}"`);
            return NextResponse.json(results, {
              headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
              },
            });
          }
        }
      } catch (apiError: any) {
        logger.warn(`YouTube Data API v3 failed, falling back to youtube-sr:`, apiError.message);
        // Continue to youtube-sr fallback below
      }
    }

    // Fallback to youtube-sr (if YOUTUBE_API_KEY not available or if it failed)
    try {
      logger.info(`Searching YouTube with youtube-sr for: "${query}"`);

      // Add timeout wrapper to prevent hanging
      const searchPromise = YouTube.search(query, { limit: 20, type: 'video' });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('YouTube search timeout')), 15000)
      );

      const videos = await Promise.race([searchPromise, timeoutPromise]) as any[];

      logger.info(`YouTube search returned ${videos?.length || 0} videos for query: "${query}"`);

      // Check if videos is actually an array
      if (!Array.isArray(videos)) {
        logger.error(`YouTube search returned non-array:`, typeof videos, videos);
        return NextResponse.json({ error: 'Invalid search response. Please try again.' }, { status: 500 });
      }

      // Filter out malformed results (defensive checks for browseId errors)
      const validVideos = videos.filter((video: any) => {
        const isValid = video &&
          video.id &&
          typeof video.id === 'string' &&
          video.title &&
          (video.url || video.id);

        if (!isValid) {
          logger.debug(`Filtered out invalid video:`, {
            hasVideo: !!video,
            hasId: !!video?.id,
            idType: typeof video?.id,
            hasTitle: !!video?.title,
            hasUrl: !!video?.url
          });
        }

        return isValid;
      });

      logger.info(`After filtering: ${validVideos.length} valid videos out of ${videos.length} total`);

      if (validVideos.length === 0) {
        logger.warn(`No valid videos found after filtering for query: "${query}"`);
        return NextResponse.json({ error: 'No videos found. Please try a different search term.' }, { status: 200 });
      }

      const results = validVideos.map(video => ({
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail?.url || '',
        duration: video.durationFormatted || '0:00',
        channel: video.channel?.name || 'Unknown',
        url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
        provider: 'youtube'
      }));

      // Cache results (non-blocking, don't fail if cache fails)
      try {
        await Promise.race([
          SEARCH_CACHE.set(cacheKey, results, 30),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 2000))
        ]);
      } catch (cacheError) {
        logger.warn('Cache set failed, but continuing:', cacheError);
      }

      logger.info(`Successfully returning ${results.length} results for query: "${query}"`);
      return NextResponse.json(results, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    } catch (error: any) {
      logger.error(`YouTube search error for query "${query}":`, error.message || error);
      // Log more details if it's the browseId error
      if (error.message?.includes('browseId') || error.stack?.includes('browseId')) {
        logger.error('YouTube browseId error - YouTube structure may have changed:', error.stack?.substring(0, 500));
      }
      // Log full error for debugging
      if (error.stack) {
        logger.error('Full error stack:', error.stack.substring(0, 1000));
      }
      return NextResponse.json({
        error: 'Failed to search videos. YouTube search is currently unavailable. Please add YOUTUBE_API_KEY to enable reliable search.',
        requiresApiKey: !YOUTUBE_API_KEY
      }, { status: 503 });
    }
  } catch (error: any) {
    logger.error('Search API unexpected error:', error.message || error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
