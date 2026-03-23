/**
 * Coverage Source Fetcher
 *
 * Fetches a coverage source URL, extracts article text and metadata,
 * and returns a structured result for storage.
 *
 * Uses the same fetch infrastructure as the website crawler (user agent
 * rotation, retry, timeouts) but with article-specific extraction:
 * title, author, published date, and article body text.
 */

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FetchSourceResult {
  /** HTTP status code */
  httpStatus: number;
  /** Whether the URL returned a successful response */
  isAlive: boolean;
  /** Extracted article title */
  articleTitle: string | null;
  /** Extracted author name */
  author: string | null;
  /** Extracted publication date */
  publishedAt: Date | null;
  /** Cleaned article text (boilerplate stripped) */
  fetchedContent: string | null;
  /** SHA-256 hash of fetchedContent for change detection */
  contentHash: string | null;
  /** Word count of fetchedContent */
  wordCount: number | null;
  /** Error message if fetch failed */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
/** Max article text length to store (chars). ~50k words covers any article. */
const CONTENT_CAP = 200_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

async function fetchUrl(url: string, retries = MAX_RETRIES): Promise<{ status: number; html: string | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const status = response.status;
    if (status >= 400) {
      return { status, html: null, error: `HTTP ${status}` };
    }

    const html = await response.text();
    return { status, html, error: null };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === 'AbortError') {
      if (retries > 0) {
        await sleep(RETRY_DELAY_MS);
        return fetchUrl(url, retries - 1);
      }
      return { status: 0, html: null, error: 'Timeout after retries' };
    }

    if (retries > 0) {
      await sleep(RETRY_DELAY_MS);
      return fetchUrl(url, retries - 1);
    }

    return { status: 0, html: null, error: (err as Error).message ?? 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Article text extraction
// ---------------------------------------------------------------------------

/**
 * Extract article body text from HTML, stripping navigation, ads, footers,
 * and other boilerplate. Targets common article content containers.
 */
function extractArticleText($: cheerio.CheerioAPI): string {
  // Clone body and strip non-content elements
  const body = $('body').clone();

  // Remove known non-content elements
  body.find([
    'script', 'style', 'noscript', 'iframe',
    'nav', 'header', 'footer',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.nav', '.navbar', '.header', '.footer', '.sidebar',
    '.ad', '.ads', '.advertisement', '.adsbygoogle',
    '.social-share', '.share-buttons', '.related-articles',
    '.newsletter-signup', '.popup', '.modal',
    '.comments', '#comments', '.comment-section',
    'aside',
  ].join(', ')).remove();

  // Try to find the main article content container
  const articleSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-body',
    '.article-content',
    '.entry-content',
    '.post-content',
    '.story-body',
    '.c-entry-content',  // Vox Media (Eater, etc.)
    '.article__body',     // LA Times
    '.rich-text',
  ];

  for (const selector of articleSelectors) {
    const container = body.find(selector);
    if (container.length > 0) {
      const text = container.text().replace(/\s+/g, ' ').trim();
      if (text.length > 200) {
        return text.slice(0, CONTENT_CAP);
      }
    }
  }

  // Fallback: use full body text
  const text = body.text().replace(/\s+/g, ' ').trim();
  return text.slice(0, CONTENT_CAP);
}

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

function extractTitle($: cheerio.CheerioAPI): string | null {
  // og:title is usually the cleanest
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  if (ogTitle) return ogTitle;

  // <title> tag
  const titleTag = $('title').first().text().replace(/\s+/g, ' ').trim();
  if (titleTag) return titleTag;

  // h1 fallback
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  if (h1) return h1;

  return null;
}

function extractAuthor($: cheerio.CheerioAPI): string | null {
  // meta[name="author"]
  const metaAuthor = $('meta[name="author"]').attr('content')?.trim();
  if (metaAuthor) return metaAuthor;

  // Schema.org Article author
  const schemas = $('script[type="application/ld+json"]');
  for (let i = 0; i < schemas.length; i++) {
    try {
      const data = JSON.parse($(schemas[i]).html() ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.author) {
          if (typeof item.author === 'string') return item.author;
          if (item.author?.name) return item.author.name;
          if (Array.isArray(item.author) && item.author[0]?.name) return item.author[0].name;
        }
      }
    } catch { /* ignore */ }
  }

  // Byline patterns in common class names
  const bylineSelectors = [
    '.byline', '.author', '.article-author',
    '[rel="author"]', '.c-byline__author-name', // Vox Media
    '.article__byline',  // LA Times
  ];
  for (const sel of bylineSelectors) {
    const text = $(sel).first().text().replace(/\s+/g, ' ').trim();
    if (text && text.length < 100) {
      // Clean common prefixes
      return text.replace(/^(by|written by|author:)\s*/i, '').trim() || null;
    }
  }

  return null;
}

function extractPublishedDate($: cheerio.CheerioAPI): Date | null {
  // meta[article:published_time] (Open Graph)
  const ogDate = $('meta[property="article:published_time"]').attr('content');
  if (ogDate) {
    const d = new Date(ogDate);
    if (!isNaN(d.getTime())) return d;
  }

  // <time> element with datetime attribute
  const timeEl = $('time[datetime]').first().attr('datetime');
  if (timeEl) {
    const d = new Date(timeEl);
    if (!isNaN(d.getTime())) return d;
  }

  // Schema.org datePublished
  const schemas = $('script[type="application/ld+json"]');
  for (let i = 0; i < schemas.length; i++) {
    try {
      const data = JSON.parse($(schemas[i]).html() ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.datePublished) {
          const d = new Date(item.datePublished);
          if (!isNaN(d.getTime())) return d;
        }
      }
    } catch { /* ignore */ }
  }

  // meta[name="date"] or meta[name="publish-date"]
  for (const name of ['date', 'publish-date', 'pubdate', 'publish_date']) {
    const val = $(`meta[name="${name}"]`).attr('content');
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a coverage source URL and extract article content + metadata.
 */
export async function fetchCoverageSource(url: string): Promise<FetchSourceResult> {
  const { status, html, error } = await fetchUrl(url);

  if (!html) {
    return {
      httpStatus: status,
      isAlive: false,
      articleTitle: null,
      author: null,
      publishedAt: null,
      fetchedContent: null,
      contentHash: null,
      wordCount: null,
      error,
    };
  }

  const $ = cheerio.load(html);

  const articleTitle = extractTitle($);
  const author = extractAuthor($);
  const publishedAt = extractPublishedDate($);
  const fetchedContent = extractArticleText($);
  const wordCount = fetchedContent ? fetchedContent.split(/\s+/).length : null;
  const contentHash = fetchedContent
    ? createHash('sha256').update(fetchedContent).digest('hex')
    : null;

  return {
    httpStatus: status,
    isAlive: status >= 200 && status < 400,
    articleTitle,
    author,
    publishedAt,
    fetchedContent: fetchedContent || null,
    contentHash,
    wordCount,
    error: null,
  };
}
