// ═══════════════════════════════════════════════════════════════
//  CinePurr AI Office — Web Search & URL Fetching
//  Gives agents the ability to research the internet like a
//  real senior engineer would.
// ═══════════════════════════════════════════════════════════════

import { SearchHit } from './types';

// ── Helpers ──────────────────────────────────────────────────

/** Strip HTML tags and decode basic entities */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract the real URL from a DuckDuckGo redirect link */
function extractRealUrl(ddgUrl: string): string {
  try {
    if (ddgUrl.includes('uddg=')) {
      const match = ddgUrl.match(/uddg=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return ddgUrl;
  } catch {
    return ddgUrl;
  }
}

// ── Primary: DuckDuckGo HTML Search ─────────────────────────

async function searchDuckDuckGoHTML(query: string): Promise<SearchHit[]> {
  const response = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12_000),
  });

  const html = await response.text();
  const results: SearchHit[] = [];

  // Extract result titles + urls
  const titleRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  // Extract snippets
  const snippetRegex =
    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = titleRegex.exec(html)) !== null) {
    titles.push({ url: extractRealUrl(m[1]), title: stripHtml(m[2]) });
  }

  const snippets: string[] = [];
  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(m[1]));
  }

  for (let i = 0; i < Math.min(titles.length, 8); i++) {
    results.push({
      title: titles[i]?.title || '',
      snippet: snippets[i] || '',
      url: titles[i]?.url || '',
    });
  }

  return results;
}

// ── Fallback: DuckDuckGo Instant Answer API ─────────────────

async function searchDuckDuckGoAPI(query: string): Promise<SearchHit[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
  });
  const data = await response.json();
  const results: SearchHit[] = [];

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      url: data.AbstractURL || '',
    });
  }

  for (const topic of data.RelatedTopics || []) {
    if (topic.Text && results.length < 6) {
      results.push({
        title: topic.Text.slice(0, 100),
        snippet: topic.Text,
        url: topic.FirstURL || '',
      });
    }
    // Handle nested topic groups
    if (topic.Topics) {
      for (const sub of topic.Topics) {
        if (sub.Text && results.length < 6) {
          results.push({
            title: sub.Text.slice(0, 100),
            snippet: sub.Text,
            url: sub.FirstURL || '',
          });
        }
      }
    }
  }

  return results;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Search the web for technical information.
 * Tries DuckDuckGo HTML scraping first, falls back to the
 * instant-answer API.
 */
export async function searchWeb(
  query: string
): Promise<{ results: SearchHit[]; source: string }> {
  // Strategy 1: HTML scraping (richest results)
  try {
    const results = await searchDuckDuckGoHTML(query);
    if (results.length > 0) {
      return { results, source: 'duckduckgo-html' };
    }
  } catch (err: any) {
    // Silently fall through to next strategy
  }

  // Strategy 2: Instant answer API (more reliable, less rich)
  try {
    const results = await searchDuckDuckGoAPI(query);
    if (results.length > 0) {
      return { results, source: 'duckduckgo-api' };
    }
  } catch {
    // Both strategies failed
  }

  return { results: [], source: 'none' };
}

/**
 * Fetch URL content and extract readable text.
 * Used when an agent wants to read a specific documentation
 * page, StackOverflow answer, or GitHub issue.
 */
export async function fetchUrlContent(
  url: string
): Promise<{ text: string; success: boolean }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CinePurrOffice/1.0; +https://cinepurr.me)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      return { text: JSON.stringify(json, null, 2).slice(0, 5000), success: true };
    }

    const html = await response.text();
    const cleanText = stripHtml(html);

    // Return first 5000 characters — enough for agents to get the gist
    return {
      text: cleanText.slice(0, 5000) || 'Page returned no readable text.',
      success: true,
    };
  } catch (err: any) {
    return {
      text: `Failed to fetch ${url}: ${err.message || 'Unknown error'}`,
      success: false,
    };
  }
}
