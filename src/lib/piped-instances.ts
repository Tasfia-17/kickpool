/**
 * Piped API Instance Configuration
 * 
 * Can be configured via environment variables or fetched from remote config.
 * Falls back to hardcoded list if no config is available.
 */

const CONFIG_URL = process.env.PIPED_INSTANCES_CONFIG_URL;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedInstances: {
  official: string[];
  cdn: string[];
  other: string[];
} | null = null;
let cacheTimestamp = 0;

// Default hardcoded instances (fallback) - Updated from https://status.piped.video/ Dec 2025
const DEFAULT_OFFICIAL = [
  'https://pipedapi.kavin.rocks',        // Official - 100% uptime, 0ms
  'https://pipedapi.kavin.rocks/libre',  // Official Libre - 100% uptime, 0ms
];

const DEFAULT_CDN = [
  'https://pipedapi.lunar.icu',          // 100% uptime, 0ms
  'https://pipedapi.vyper.me',           // 100% uptime, 0ms
  'https://pipedapi.looleh.xyz',         // 100% uptime, 0ms
];

const DEFAULT_OTHER = [
  'https://pipedapi.nosebs.ru',          // 100% uptime, 1578ms (slower but reliable)
  'https://api.piped.yt',
  'https://pipedapi.darkness.services',
];

/**
 * Parse instances from environment variable
 * Format: "url1,url2,url3" or JSON array
 */
function parseEnvInstances(envVar: string | undefined, defaultList: string[]): string[] {
  if (!envVar) return defaultList;
  
  try {
    // Try JSON first
    const parsed = JSON.parse(envVar);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((url: any) => typeof url === 'string' && url.startsWith('http'));
    }
  } catch {
    // Fall back to comma-separated
    const urls = envVar.split(',').map(s => s.trim()).filter(s => s.startsWith('http'));
    if (urls.length > 0) return urls;
  }
  
  return defaultList;
}

/**
 * Fetch instances from remote config (GitHub Gist, etc.)
 */
async function fetchRemoteConfig(): Promise<{
  official: string[];
  cdn: string[];
  other: string[];
} | null> {
  if (!CONFIG_URL) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(CONFIG_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CinePurr/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        official: Array.isArray(data.official) ? data.official : DEFAULT_OFFICIAL,
        cdn: Array.isArray(data.cdn) ? data.cdn : DEFAULT_CDN,
        other: Array.isArray(data.other) ? data.other : DEFAULT_OTHER,
      };
    }
  } catch {
    // Silently fail, use defaults
  }

  return null;
}

/**
 * Get Piped instances (from cache, remote config, env vars, or defaults)
 */
export async function getPipedInstances(): Promise<{
  official: string[];
  cdn: string[];
  other: string[];
}> {
  // Check cache first
  if (cachedInstances && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedInstances;
  }

  // Try environment variables first
  const official = parseEnvInstances(
    process.env.PIPED_OFFICIAL_INSTANCES,
    DEFAULT_OFFICIAL
  );
  const cdn = parseEnvInstances(
    process.env.PIPED_CDN_INSTANCES,
    DEFAULT_CDN
  );
  const other = parseEnvInstances(
    process.env.PIPED_OTHER_INSTANCES,
    DEFAULT_OTHER
  );

  // If all are from env vars (not defaults), use them
  if (
    process.env.PIPED_OFFICIAL_INSTANCES ||
    process.env.PIPED_CDN_INSTANCES ||
    process.env.PIPED_OTHER_INSTANCES
  ) {
    cachedInstances = { official, cdn, other };
    cacheTimestamp = Date.now();
    return cachedInstances;
  }

  // Try remote config (non-blocking, use defaults if fails)
  const remoteConfig = await fetchRemoteConfig();
  if (remoteConfig) {
    cachedInstances = remoteConfig;
    cacheTimestamp = Date.now();
    return cachedInstances;
  }

  // Fall back to defaults
  cachedInstances = { official, cdn, other };
  cacheTimestamp = Date.now();
  return cachedInstances;
}

/**
 * Get Invidious instances
 */
export function getInvidiousInstances(): string[] {
  return parseEnvInstances(
    process.env.INVIDIOUS_INSTANCES,
    [
      'https://inv.riverside.rocks',
      'https://yewtu.be',
      'https://invidious.flokinet.to',
      // Removed snopyta.org - triggers Cloudflare CAPTCHA for server-side requests
    ]
  );
}

