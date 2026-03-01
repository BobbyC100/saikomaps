/**
 * Single-place enrichment pipeline: fetch (home + optional about), extract, confidence, payload.
 */

import { normalizeUrl } from "./url";
import { fetchWithLimits } from "./fetch";
import { parseHtml } from "./parse";
import { findAboutLink } from "./about";
import { extractFromSchemaBlocks } from "./schema";
import { extractLinkSignals } from "./links";
import {
  scoreSources,
  pickCategoryFromScores,
  applyTieBreakers,
} from "./keywords";
import { computeConfidence } from "./confidence";
import { MAX_REQUESTS_PER_PLACE, ABOUT_VISIBLE_TEXT_CAP } from "./constants";
import type { EnrichmentPayload, EnrichmentSignals, EnrichmentRaw } from "./types";

export interface RunEnrichmentInput {
  place_id: string;
  website: string;
}

export async function runEnrichmentForPlace(
  input: RunEnrichmentInput
): Promise<EnrichmentPayload> {
  const notes: string[] = [];
  const sourceUrl = normalizeUrl(input.website);
  const payload: EnrichmentPayload = {
    place_id: input.place_id,
    source_url: sourceUrl,
    final_url: null,
    http_status: null,
    schema_types: [],
    signals: {
      inferred_category: null,
      inferred_cuisine: null,
      reservation_provider: null,
      reservation_url: null,
      ordering_provider: null,
      ordering_url: null,
      menu_url: null,
      social_links: null,
    },
    confidence: 0.4,
    notes: [],
    raw: {
      title: null,
      meta_description: null,
      h1: null,
      lang: null,
    },
  };

  // Request 1: Homepage
  const homeResult = await fetchWithLimits(sourceUrl);
  payload.final_url = homeResult.finalUrl;
  payload.http_status = homeResult.status;

  if (homeResult.status !== 200 || !homeResult.html) {
    payload.notes.push("homepage fetch failed or non-200");
    return payload;
  }

  const homeParsed = parseHtml(homeResult.html);
  payload.raw.title = homeParsed.title;
  payload.raw.meta_description = homeParsed.metaDescription;
  payload.raw.h1 = homeParsed.h1;
  payload.raw.lang = homeParsed.lang;
  payload.raw.homepage_text_sample = homeParsed.visibleText.slice(0, 2000);

  const schemaExtraction = extractFromSchemaBlocks(homeParsed.schemaBlocks);
  payload.schema_types = schemaExtraction.schemaTypes ?? [];
  if ((schemaExtraction.schemaTypes ?? []).length > 0) notes.push("schema present");

  const allLinks = [...homeParsed.links];
  let aboutText: string | null = null;

  // Request 2: About page (optional)
  const aboutHref = findAboutLink(homeParsed.links, sourceUrl);
  if (aboutHref) {
    const aboutResult = await fetchWithLimits(aboutHref);
    if (aboutResult.status === 200 && aboutResult.html) {
      const aboutParsed = parseHtml(aboutResult.html);
      aboutText = aboutParsed.visibleText.slice(0, ABOUT_VISIBLE_TEXT_CAP);
      payload.raw.about_text_sample = aboutText.slice(0, 2000);
      notes.push("about page used");
      aboutParsed.links.forEach((l) => allLinks.push(l));
    }
  }

  const baseUrl = homeResult.finalUrl ?? sourceUrl;
  const linkSignals = extractLinkSignals(allLinks, baseUrl);

  const signals: EnrichmentSignals = {
    inferred_category: schemaExtraction.saikoCategory ?? null,
    inferred_cuisine:
      schemaExtraction.cuisine.length > 0 ? schemaExtraction.cuisine : null,
    reservation_provider: linkSignals.reservation_provider ?? null,
    reservation_url: linkSignals.reservation_url ?? null,
    ordering_provider: linkSignals.ordering_provider ?? null,
    ordering_url: linkSignals.ordering_url ?? null,
    menu_url: schemaExtraction.menuUrl ?? linkSignals.menu_url ?? null,
    social_links:
      Object.keys(linkSignals.social_links).length > 0
        ? linkSignals.social_links
        : null,
  };
  payload.signals = signals;

  const combinedText = [
    homeParsed.title,
    homeParsed.metaDescription,
    homeParsed.h1,
    homeParsed.visibleText,
    aboutText,
  ]
    .filter(Boolean)
    .join(" ");

  const rawScores = scoreSources({
    title: homeParsed.title,
    h1: homeParsed.h1,
    aboutText,
    metaDescription: homeParsed.metaDescription,
    bodyText: homeParsed.visibleText,
    anchorTexts: homeParsed.links.map((l) => l.text),
  });
  const adjustedScores = applyTieBreakers(rawScores, combinedText);

  if (!signals.inferred_category) {
    const keywordCategory = pickCategoryFromScores(adjustedScores, combinedText);
    if (keywordCategory) signals.inferred_category = keywordCategory;
  }

  const hasStrongSchema =
    (schemaExtraction.schemaTypes ?? []).length > 0 &&
    schemaExtraction.saikoCategory != null;

  payload.confidence = computeConfidence({
    hasStrongSchema,
    keywordScores: adjustedScores,
    combinedText,
    hasReservation: !!signals.reservation_provider,
    hasMenu: !!signals.menu_url,
  });

  payload.notes = notes;
  return payload;
}
