import { NextRequest, NextResponse } from 'next/server';
import YouTube from 'youtube-sr';
import logger from '@/lib/logger';
import { SEARCH_CACHE } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// YouTube Data API v3 - Official Google API (most reliable)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

// Service health tracking (circuit breaker pattern)
const serviceHealth = new Map<string, { failCount: number; lastFail: number; lastSuccess: number }>();
const MAX_FAIL_COUNT = 3;
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function shouldTryService(url: string): boolean {
  const health = serviceHealth.get(url);
  if (!health) return true;

  // Skip if failed too many times recently
  if (health.failCount >= MAX_FAIL_COUNT && Date.now() - health.lastFail < CIRCUIT_BREAKER_TIMEOUT) {
    return false;
  }

  return true;
}

function recordServiceFailure(url: string) {
  const health = serviceHealth.get(url) || { failCount: 0, lastFail: 0, lastSuccess: 0 };
  health.failCount++;
  health.lastFail = Date.now();
  serviceHealth.set(url, health);
}

function recordServiceSuccess(url: string) {
  serviceHealth.set(url, { failCount: 0, lastFail: 0, lastSuccess: Date.now() });
}

// Helper to parse ISO8601 duration (PT1H2M3S format) to seconds
function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Rate limiting for music search
const searchRateLimiter = new Map<string, { count: number; resetAt: number }>();
const SEARCH_RATE_LIMIT = 30; // requests per window
const SEARCH_RATE_WINDOW = 60_000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = searchRateLimiter.get(clientIP);
    if (entry && now < entry.resetAt) {
      if (entry.count >= SEARCH_RATE_LIMIT) {
        return NextResponse.json(
          { results: [], error: 'Too many requests. Please wait a moment.' },
          { status: 429 }
        );
      }
      entry.count++;
    } else {
      searchRateLimiter.set(clientIP, { count: 1, resetAt: now + SEARCH_RATE_WINDOW });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    logger.info(`Music search request: ${query}`);

    // Check cache first
    const cacheKey = `music:${query.toLowerCase().trim()}`;
    const cached = await SEARCH_CACHE.get(cacheKey);
    if (cached) {
      logger.info(`Music search cache hit for: ${query}`);
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // PRIMARY: Use YouTube Data API v3 if available (official, most reliable)
    if (YOUTUBE_API_KEY) {
      const youtubeApiUrl = 'youtube-data-api-v3';
      if (shouldTryService(youtubeApiUrl)) {
        try {
          logger.info(`Trying YouTube Data API v3 for query: "${query}"`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          // Search for videos (don't restrict to music category to get better results)
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`;

          const response = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            },
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();

            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              // Get video details for duration
              const videoIds = data.items.map((item: any) => item.id.videoId).join(',');

              const durations: Record<string, number> = {};
              try {
                const detailsController = new AbortController();
                const detailsTimeout = setTimeout(() => detailsController.abort(), 8000);

                const detailsResponse = await fetch(
                  `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`,
                  {
                    signal: detailsController.signal,
                    headers: { 'Accept': 'application/json' }
                  }
                );

                clearTimeout(detailsTimeout);

                if (detailsResponse.ok) {
                  const detailsData = await detailsResponse.json();
                  detailsData.items?.forEach((item: any) => {
                    const duration = parseISO8601Duration(item.contentDetails.duration);
                    durations[item.id] = duration;
                  });
                }
              } catch (e) {
                logger.warn('Failed to fetch video durations, continuing without them:', e);
              }

              // Use Piped stream URLs for YouTube Data API results
              // Try official instance first, fallback to others if needed
              const pipedBase = 'https://pipedapi.kavin.rocks';
              const results = data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title || 'Unknown',
                artist: item.snippet.channelTitle || 'Unknown',
                duration: durations[item.id.videoId] || 0,
                url: `${pipedBase}/streams/${item.id.videoId}`, // Piped stream URL
                thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ''
              }));

              logger.info(`YouTube Data API v3 found ${results.length} results for query: "${query}"`);
              recordServiceSuccess(youtubeApiUrl);

              // Cache successful results
              const responseData = { results, instance: 'youtube-data-api-v3', type: 'youtube-official' };
              await SEARCH_CACHE.set(cacheKey, responseData, 300);

              return NextResponse.json(responseData, {
                headers: {
                  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET',
                },
              });
            } else {
              logger.warn(`YouTube Data API v3 returned no items for query: "${query}"`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            logger.error(`YouTube Data API v3 returned status ${response.status} for query "${query}":`, errorData);
            if (response.status === 403 || response.status === 401) {
              // API key issue - don't retry
              recordServiceFailure(youtubeApiUrl);
              return NextResponse.json(
                {
                  results: [],
                  error: 'YouTube API key invalid or quota exceeded',
                  message: 'Please check your YOUTUBE_API_KEY configuration'
                },
                { status: 500 }
              );
            }
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            recordServiceFailure(youtubeApiUrl);
            logger.error(`YouTube Data API v3 failed for query "${query}":`, error.message || error);
          }
        }
      }
    } else {
      logger.info('YouTube Data API v3 key not found, using fallback methods');
    }

    // PRIMARY: Try Piped API (returns stream URLs directly)
    // Updated from https://status.piped.video/ (Dec 2025)
    const pipedInstances = [
      // Official instances (100% uptime)
      'https://pipedapi.kavin.rocks',

      // High-reliability instances (100% uptime, 0ms)
      'https://pipedapi.lunar.icu',
      'https://pipedapi.vyper.me',
      'https://pipedapi.looleh.xyz',

      // Reliable fallbacks
      'https://pipedapi.nosebs.ru',          // 100% uptime, 1578ms
      'https://api.piped.yt',
    ];

    for (const pipedBase of pipedInstances) {
      const pipedUrl = `${pipedBase}/search`;
      if (shouldTryService(pipedUrl)) {
        try {
          logger.info(`Trying Piped API: ${pipedBase}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(`${pipedUrl}?q=${encodeURIComponent(query)}&filter=music`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
              const results = data.slice(0, 10).map((item: any) => ({
                id: item.videoId || item.id,
                title: item.title || 'Unknown',
                artist: item.uploaderName || item.channelName || 'Unknown',
                duration: item.duration || 0,
                url: `${pipedBase}/streams/${item.videoId || item.id}`, // Piped stream URL
                thumbnail: item.thumbnailUrl || item.thumbnail || ''
              }));

              logger.info(`Piped API found ${results.length} results`);
              recordServiceSuccess(pipedUrl);

              const responseData = { results, instance: pipedBase, type: 'piped' };
              await SEARCH_CACHE.set(cacheKey, responseData, 300);

              return NextResponse.json(responseData, {
                headers: {
                  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            recordServiceFailure(pipedUrl);
            logger.debug(`Piped instance ${pipedBase} failed:`, error.message?.substring(0, 50));
          }
        }
      }
    }

    // FALLBACK: Use youtube-sr (same library as video search - proven to work)
    const youtubeSrUrl = 'youtube-sr';
    if (shouldTryService(youtubeSrUrl)) {
      try {
        logger.info('Trying youtube-sr (fallback method)');

        // Add timeout wrapper
        const searchPromise = YouTube.search(query, { limit: 10, type: 'video' });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('youtube-sr timeout')), 10000)
        );

        const videos = await Promise.race([searchPromise, timeoutPromise]) as any[];

        if (videos && Array.isArray(videos) && videos.length > 0) {
          // Filter out malformed results (defensive checks)
          const validVideos = videos.filter((video: any) => {
            return video &&
              video.id &&
              typeof video.id === 'string' &&
              video.title &&
              (video.url || video.id);
          });

          if (validVideos.length > 0) {
            // Try to get Piped stream URLs for youtube-sr results
            const pipedBase = pipedInstances[0];
            const results = validVideos.map((video: any) => ({
              id: video.id,
              title: video.title || 'Unknown',
              artist: video.channel?.name || video.channelName || 'Unknown',
              duration: video.duration || 0,
              url: `${pipedBase}/streams/${video.id}`, // Use Piped stream URL
              thumbnail: video.thumbnail?.url || video.thumbnail || ''
            }));

            logger.info(`youtube-sr found ${results.length} results`);
            recordServiceSuccess(youtubeSrUrl);

            // Cache successful results
            const response = { results, instance: 'youtube-sr+piped', type: 'youtube-sr' };
            await SEARCH_CACHE.set(cacheKey, response, 300);

            return NextResponse.json(response, {
              headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              },
            });
          }
        }
        recordServiceSuccess(youtubeSrUrl);
      } catch (error: any) {
        recordServiceFailure(youtubeSrUrl);
        logger.warn('youtube-sr fallback failed:', error.message || error);
      }
    } else {
      logger.info('youtube-sr skipped (circuit breaker active)');
    }




    logger.warn('All music search methods failed');
    // Return 503 Service Unavailable with proper error message
    return NextResponse.json(
      {
        results: [],
        error: 'Service temporarily unavailable',
        message: 'Music search services are experiencing issues. Please try again later.',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  } catch (error: any) {
    logger.error('Music search API error:', error.message || error);
    return NextResponse.json(
      {
        results: [],
        error: 'An error occurred while searching',
        message: 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
