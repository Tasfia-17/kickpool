import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Dynamically import ytdl-core only when needed (lazy loading to avoid slow builds)
async function getYtdl() {
  try {
    // In Next.js, we need to use require for CommonJS modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ytdl = require('ytdl-core');
    // ytdl-core exports as a function, not as default
    return ytdl.default || ytdl;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.warn('ytdl-core not available:', message);
    // Try ES module import as fallback
    try {
      const ytdl = await import('ytdl-core');
      return ytdl.default || ytdl;
    } catch (e2: any) {
      logger.error('Both require and import failed for ytdl-core:', e2.message);
      return null;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    logger.info(`Stream request for video ID: ${videoId}`);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Try to get audio stream using ytdl-core (lazy loaded)
    const ytdl = await getYtdl();
    if (ytdl) {
      try {
        logger.info(`Attempting to extract audio stream for ${videoId} using ytdl-core`);

        // Add timeout for ytdl-core operations
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ytdl-core timeout')), 20000) // Increased timeout to 20s
        );

        // Get video info with proper options
        const infoPromise = ytdl.getInfo(videoUrl, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-us,en;q=0.5',
              'Accept-Encoding': 'gzip,deflate',
              'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
              'Keep-Alive': '300',
              'Connection': 'keep-alive',
            },
          },
        });

        const info = await Promise.race([infoPromise, timeoutPromise]) as any;

        if (!info || !info.formats || !Array.isArray(info.formats) || info.formats.length === 0) {
          throw new Error('No formats found in video info');
        }

        logger.debug(`Found ${info.formats.length} formats for ${videoId}`);

        // Find the best audio format - try multiple strategies
        let audioFormat = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio',
          filter: 'audioonly'
        });

        // If no audio-only format found, try to find any audio format
        if (!audioFormat) {
          audioFormat = info.formats.find((f: any) =>
            f.hasAudio && !f.hasVideo && f.url
          );
        }

        // If still no format, try to find any format with audio
        if (!audioFormat) {
          audioFormat = info.formats.find((f: any) =>
            f.hasAudio && f.url && (f.mimeType?.includes('audio') || f.audioCodec)
          );
        }

        if (audioFormat && audioFormat.url) {
          logger.info(`Successfully found audio stream for ${videoId}: ${audioFormat.mimeType || 'audio'}`);
          return NextResponse.json({
            success: true,
            url: audioFormat.url,
            format: audioFormat.mimeType || 'audio/mp4',
            duration: parseInt(info.videoDetails?.lengthSeconds || '0', 10),
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
          });
        } else {
          logger.warn(`No suitable audio format found for ${videoId} - checked ${info.formats.length} formats`);
        }
      } catch (ytdlError: any) {
        logger.error(`ytdl-core failed for ${videoId}:`, ytdlError.message || ytdlError);
        // Continue to fallback
      }
    } else {
      logger.warn('ytdl-core module not available');
    }

    // Fallback: Try using youtube-sr to get stream info
    try {
      logger.info(`Trying youtube-sr as fallback for ${videoId}`);
      const YouTube = await import('youtube-sr');
      const video = await YouTube.default.getVideo(videoUrl);

      if (video && video.url) {
        // youtube-sr doesn't provide direct audio streams, but we can try
        // to use the video URL and let the browser handle it
        // However, HTML5 audio can't play YouTube URLs directly
        logger.warn(`youtube-sr found video but can't extract audio stream for ${videoId}`);
      }
    } catch (srError: any) {
      logger.debug(`youtube-sr fallback failed:`, srError.message?.substring(0, 50));
    }

    // Final fallback: Return error with helpful message
    logger.warn(`Cannot extract audio stream for ${videoId} - all methods failed`);
    return NextResponse.json({
      success: false,
      error: 'Cannot extract audio stream',
      message: 'YouTube audio extraction is currently unavailable. Please use the video player on the room page to play YouTube videos.',
      url: videoUrl,
      format: 'youtube',
      duration: 0,
    }, {
      status: 503, // Service Unavailable
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });

  } catch (error: any) {
    logger.error('Stream API error (top-level catch):', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Stream unavailable'
      },
      { status: 500 }
    );
  }
}

