/**
 * YouTube URL utilities for parsing and normalizing YouTube video URLs
 */

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Remove any whitespace
  url = url.trim();

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Normalize YouTube URL to standard format
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Validate if a string is a valid YouTube URL or video ID
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Get YouTube embed URL from video ID or URL
 */
export function getYouTubeEmbedUrl(urlOrId: string): string | null {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) return null;
  
  return `https://www.youtube.com/embed/${videoId}`;
}

