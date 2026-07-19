import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import net from 'net';
import logger from '@/lib/logger';

/**
 * IPTV Proxy Route
 * 
 * Proxies HTTP IPTV streams through the server so they can be played
 * on the HTTPS site without mixed-content or CSP violations.
 * 
 * - For .m3u8 playlists: fetches content and rewrites internal URLs to also go through the proxy
 * - For .ts segments and other binary data: streams content through
 */

const PROXY_TIMEOUT = 30000; // 30 seconds

const IPV4_PRIVATE_CIDRS = [
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['100.64.0.0', 10],
  ['0.0.0.0', 8],
] as const;

const ALLOWED_PROXY_HOSTS = (process.env.IPTV_PROXY_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

// Derived from NEXTAUTH_URL — any request targeting the same origin is blocked
// to prevent server-side requests being used as an admin-API bypass.
const OWN_HOSTNAMES: Set<string> = (() => {
  const hosts = new Set<string>();
  for (const key of ['NEXTAUTH_URL', 'NEXT_PUBLIC_SITE_URL'] as const) {
    const val = process.env[key];
    if (val) {
      try {
        hosts.add(new URL(val).hostname.toLowerCase());
      } catch { /* ignore malformed env */ }
    }
  }
  return hosts;
})();

function isValidStreamUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (net.isIP(ip) !== 4) return false;
  const ipInt = ipv4ToInt(ip);
  return IPV4_PRIVATE_CIDRS.some(([base, bits]) => {
    const mask = (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  if (net.isIP(ip) !== 6) return false;
  const normalized = ip.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local');
}

async function isBlockedTarget(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block the site's own domain to prevent same-origin SSRF (e.g. proxying /api/admin/*)
  if (OWN_HOSTNAMES.has(hostname)) {
    return true;
  }

  if (isLocalHostname(hostname)) {
    return true;
  }

  // Block bare IPv6 literals that bypass hostname checks (e.g. ::1, [::1])
  if (net.isIP(hostname.replace(/\[|\]/g, '')) === 6) {
    const bare = hostname.replace(/\[|\]/g, '');
    if (isPrivateIPv6(bare)) return true;
  }

  if (ALLOWED_PROXY_HOSTS.length > 0 && !ALLOWED_PROXY_HOSTS.includes(hostname)) {
    return true;
  }

  if (net.isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
    return true;
  }

  if (net.isIP(hostname) === 6 && isPrivateIPv6(hostname)) {
    return true;
  }

  try {
    const resolved = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (!resolved.length) return true;
    return resolved.some(({ address }) => isPrivateIPv4(address) || isPrivateIPv6(address));
  } catch {
    return true;
  }
}

function rewriteM3U8Content(content: string, baseUrl: string): string {
  const lines = content.split('\n');
  const rewritten = lines.map((line) => {
    const trimmed = line.trim();

    // Skip empty lines and pure comment lines (but process EXT tags with URIs below)
    if (!trimmed) return line;

    // Handle #EXT-X-MAP:URI="..." and #EXT-X-KEY:...URI="..." directives
    if (trimmed.startsWith('#EXT-X-MAP:') || trimmed.startsWith('#EXT-X-KEY:')) {
      return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
        const absoluteUrl = resolveUrl(uri, baseUrl);
        if (absoluteUrl.startsWith('http://')) {
          return `URI="/api/iptv-proxy?url=${encodeURIComponent(absoluteUrl)}"`;
        }
        return `URI="${uri}"`;
      });
    }

    // Skip other comment/tag lines
    if (trimmed.startsWith('#')) return line;

    // This is a URL line (segment or sub-playlist)
    const absoluteUrl = resolveUrl(trimmed, baseUrl);
    if (absoluteUrl.startsWith('http://')) {
      return `/api/iptv-proxy?url=${encodeURIComponent(absoluteUrl)}`;
    }

    // HTTPS URLs can be loaded directly by the browser
    return absoluteUrl.startsWith('https://') ? absoluteUrl : line;
  });

  return rewritten.join('\n');
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Relative URL — resolve against base
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return baseUrl + url;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const userAgent = request.nextUrl.searchParams.get('ua');
  const referrer = request.nextUrl.searchParams.get('referer');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  if (!isValidStreamUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (await isBlockedTarget(url)) {
    return NextResponse.json({ error: 'Blocked target host' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT);

    const requestHeaders: Record<string, string> = {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (referrer) {
      requestHeaders['Referer'] = referrer;
    }

    // Follow redirects manually so every hop is validated against isBlockedTarget().
    // Using redirect:'follow' would allow a public host to redirect to 169.254.x.x etc.
    let fetchUrl = url;
    let response!: Response;
    const MAX_REDIRECTS = 5;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(fetchUrl, {
        headers: requestHeaders,
        signal: controller.signal,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          clearTimeout(timeout);
          return NextResponse.json({ error: 'Redirect without Location' }, { status: 502 });
        }
        const nextUrl = location.startsWith('http') ? location : new URL(location, fetchUrl).href;
        if (await isBlockedTarget(nextUrl)) {
          clearTimeout(timeout);
          return NextResponse.json({ error: 'Blocked target host' }, { status: 400 });
        }
        fetchUrl = nextUrl;
        continue;
      }

      break; // non-redirect response — done
    }

    clearTimeout(timeout);

    if (!response.ok) {
      return new NextResponse(null, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle m3u8 playlists — rewrite internal URLs
    const isM3U8 = url.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('vnd.apple.mpegurl');

    if (isM3U8) {
      const content = await response.text();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      const rewrittenContent = rewriteM3U8Content(content, baseUrl);

      return new NextResponse(rewrittenContent, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Cache-Control': 'no-cache, no-store',
        },
      });
    }

    // For .ts segments and other binary data — stream through directly
    // Streaming the body instead of buffering prevents data corruption
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType || 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Cache-Control': 'public, max-age=60',
    };

    // Pass through content-related headers from upstream
    const contentLength = response.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    const contentRange = response.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Proxy request timed out' }, { status: 504 });
    }
    logger.error('[IPTV Proxy] Error proxying:', url, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}
