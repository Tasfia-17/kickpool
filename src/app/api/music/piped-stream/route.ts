import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// NOTE: Piped/Invidious services are frequently blocked by YouTube
// Check https://status.piped.video/ and https://api.invidious.io/ for current status
// Updated: Dec 2025

const PIPED_INSTANCES = [
  'https://pipedapi.adminforge.de',      // Responsive
  'https://pipedapi.lunar.icu',          // Responsive
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
  'https://api.piped.privacydev.net',
];

// Invidious instances as fallback
const INVIDIOUS_INSTANCES = [
  'https://invidious.protokolla.fi',  // Working (200 OK)
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.privacydev.net',
  'https://iv.nboeck.de',
];

// Try to get audio URL from Piped
async function tryPiped(videoId: string): Promise<string | null> {
  const checks = PIPED_INSTANCES.map(async (instance) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();

      // Check for error response (YouTube blocking)
      if (data.error) {
        throw new Error(data.message || 'Blocked by YouTube');
      }

      // Find best audio stream (prefer higher bitrate)
      const audioStreams = data.audioStreams?.filter((s: any) => s.url && s.bitrate) || [];
      const sortedAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      const audio = sortedAudio[0];

      if (audio?.url) {
        logger.info(`✓ Piped success: ${instance}`);
        return audio.url;
      }
      throw new Error('No audio found');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        logger.debug(`Piped ${instance} failed:`, e.message?.substring(0, 50));
      }
      throw e;
    }
  });

  try {
    return await Promise.any(checks);
  } catch {
    return null;
  }
}

// Try to get audio URL from Invidious
async function tryInvidious(videoId: string): Promise<string | null> {
  const checks = INVIDIOUS_INSTANCES.map(async (instance) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();

      // Get adaptive audio formats
      const audioFormats = data.adaptiveFormats?.filter((f: any) =>
        f.type?.includes('audio') && f.url
      ) || [];

      // Prefer opus/webm over aac
      const sorted = audioFormats.sort((a: any, b: any) => {
        const aIsOpus = a.type?.includes('opus') ? 1 : 0;
        const bIsOpus = b.type?.includes('opus') ? 1 : 0;
        return bIsOpus - aIsOpus || (b.bitrate || 0) - (a.bitrate || 0);
      });

      if (sorted[0]?.url) {
        logger.info(`✓ Invidious success: ${instance}`);
        return sorted[0].url;
      }
      throw new Error('No audio found');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        logger.debug(`Invidious ${instance} failed:`, e.message?.substring(0, 50));
      }
      throw e;
    }
  });

  try {
    return await Promise.any(checks);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('id');
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  logger.info(`Fetching audio for: ${videoId}`);

  // Try Invidious first (currently more reliable)
  let audioUrl = await tryInvidious(videoId);

  // Fall back to Piped if Invidious fails
  if (!audioUrl) {
    logger.info('Invidious failed, trying Piped...');
    audioUrl = await tryPiped(videoId);
  }

  if (!audioUrl) {
    logger.error('All audio streaming services failed - YouTube may be blocking');
    return NextResponse.json({
      error: 'YouTube is currently blocking audio services',
      message: 'Music streaming is temporarily unavailable. YouTube frequently blocks third-party services. Please try again later or use the video player instead.',
      status: 'blocked'
    }, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // Redirect to the audio URL (let browser fetch directly)
  logger.info(`Redirecting to audio URL`);
  return NextResponse.redirect(audioUrl);
}
