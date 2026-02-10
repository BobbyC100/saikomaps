/**
 * Website Crawler Types
 * 
 * Core types for capturing canonical place identity from websites.
 * Extractors are pure functions: (html, baseUrl) => Result
 * 
 * Design principles:
 * - Source URLs are first-class (auditability)
 * - Confidence is explicit but human-readable
 * - Failure is non-exceptional (nulls, not throws)
 */

/**
 * Discrete confidence tiers with semantic meaning:
 * 
 * 1.0  = Exact match (e.g., `/menu` path, explicit "Menu" nav item)
 * 0.75 = Strong signal (e.g., `/food`, `/dinner`, nav item "Food & Drink")
 * 0.5  = Moderate signal (e.g., PDF with "menu" in filename)
 * 0.25 = Weak signal (e.g., link text contains "menu" but ambiguous context)
 * 0    = No signal / placeholder
 */
export type ExtractorConfidence = 0 | 0.25 | 0.5 | 0.75 | 1;

/**
 * A discovered link with provenance and confidence.
 */
export interface ExtractedLink {
  url: string;                      // Resolved absolute URL
  sourceUrl: string;                // Page where link was discovered
  confidence: ExtractorConfidence;
  reason: string;                   // Human-readable heuristic explanation
}

/**
 * Extracted text content with provenance.
 */
export interface ExtractedText {
  text: string;                     // Cleaned text (nav/footer stripped)
  sourceUrl: string;                // URL text was extracted from
  confidence: ExtractorConfidence;
  reason: string;
}

/**
 * Result types for each extractor (pure function outputs)
 */
export interface MenuExtractionResult {
  menu: ExtractedLink | null;
  rawText: string | null;           // Menu page content for AI processing
}

export interface WineListExtractionResult {
  wineList: ExtractedLink | null;
  rawText: string | null;
}

export interface AboutPageDiscoveryResult {
  aboutLink: ExtractedLink | null;
}

export interface AboutCopyExtractionResult {
  about: ExtractedText | null;
}

/**
 * Scrape status enum - separates pipeline health from data completeness
 * 
 * 'success'    - Fetched website, extracted at least one signal
 * 'partial'    - Fetched but only some extractions succeeded
 * 'no_website' - Record has no website URL
 * 'blocked'    - HTTP 403/401 or bot detection
 * 'timeout'    - Request timed out after retries
 * 'failed'     - Other error (network, parsing, etc.)
 */
export type ScrapeStatus = 'success' | 'partial' | 'no_website' | 'blocked' | 'timeout' | 'failed';

/**
 * The canonical identity snapshot - what the scraper produces per place.
 * 
 * This is:
 * - Serializable (can be logged, stored, replayed)
 * - AI-ready (raw text for signal extraction)
 * - Auditable (source URLs for every extracted element)
 */
export interface WebsiteIdentitySnapshot {
  // Extracted data
  menu?: ExtractedLink;
  menuRawText?: string;
  wineList?: ExtractedLink;
  wineListRawText?: string;
  about?: ExtractedText;

  // Metadata
  scrapedAt: Date;
  scrapeStatus: ScrapeStatus;
  errorMessage?: string;
}

/**
 * Input record shape from golden_records
 */
export interface GoldenRecordInput {
  canonical_id: string;
  name: string;
  website: string | null;
  neighborhood?: string | null;
}

/**
 * Fetcher configuration
 */
export interface FetcherConfig {
  requestDelayMs: number;
  batchSize: number;
  batchDelayMs: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  userAgents: string[];
}

/**
 * Fetch result with status
 */
export interface FetchResult {
  html: string | null;
  finalUrl: string;
  status: 'ok' | 'blocked' | 'timeout' | 'error';
  errorMessage?: string;
}
