import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// CLEANED LIST: Only instances verified working in late 2024/2025
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',      // Official (Best)
  'https://api.piped.io',              // Reliable
  'https://pipedapi.drgns.space',      // Good backup
  'https://api.piped.projectsegfau.lt', // Privacy-focused
  'https://pipedapi.moomoo.me',        // Often fast
];

// Helper to race requests (First success wins)
async function getFastestInstance(videoId: string): Promise<string | null> {
  // Create a promise for each instance
  const checks = PIPED_INSTANCES.map(async (instance) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) throw new Error('Not JSON');

      const data = await res.json();
      
      // Find valid audio stream (m4a/webm)
      const audio = data.audioStreams?.find((s: any) => s.url && s.bitrate);
      
      if (audio?.url) {
        logger.info(`✓ Winner: ${instance}`);
        return audio.url;
      }
      throw new Error('No audio found');
    } catch (e: any) {
      // Log error for debugging but don't reject here (Promise.any handles it)
      if (e.name !== 'AbortError') {
        logger.debug(`Piped instance ${instance} failed:`, e.message?.substring(0, 50));
      }
      throw e; // Re-throw so Promise.any knows this one failed
    }
  });

  try {
    // Promise.any waits for the FIRST success, ignoring failures
    return await Promise.any(checks);
  } catch (error) {
    logger.error('All Piped instances failed');
    return null;
  }
}

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('id');
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  logger.info(`Fetching audio for: ${videoId}`);

  // Try to get a URL from Piped
  const audioUrl = await getFastestInstance(videoId);

  if (!audioUrl) {
    return NextResponse.json({ 
      error: 'All streams failed. Try again.',
      message: 'All Piped instances are currently unavailable.'
    }, { 
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  }

  // CRITICAL FIX: Do NOT proxy. Redirect.
  // Proxying caused the 403 error because your server IP was different 
  // from the Piped server IP that generated the link.
  // Redirecting lets the user's browser fetch directly from Piped's URL.
  logger.info(`Redirecting to audio URL from Piped`);
  return NextResponse.redirect(audioUrl);
}
