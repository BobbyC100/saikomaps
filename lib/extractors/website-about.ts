/**
 * lib/extractors/website-about.ts
 *
 * Public API for About-page discovery and extraction.
 * WO-FIELDS-DONNAS-ABOUT-EXTRACT-001
 *
 * Implementation lives in lib/website-enrichment/about.ts.
 * This barrel provides a stable import path for callers outside
 * the enrichment pipeline (scripts, tests, future admin tooling).
 */

export {
  discoverAboutUrl,
  extractAboutText,
  checkAboutQuality,
  findAboutLink,
  ABOUT_EXTRACT_MIN_CHARS,
  ABOUT_EXTRACT_TARGET_MIN,
  ABOUT_EXTRACT_TARGET_MAX,
  ABOUT_EXTRACT_HARD_CAP,
} from '@/lib/website-enrichment/about';

export type { AboutExtractionResult } from '@/lib/website-enrichment/about';
