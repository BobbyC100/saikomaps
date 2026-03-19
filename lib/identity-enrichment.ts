/**
 * Pre-Review Identity Enrichment Gate
 *
 * Runs cheap-first automated discovery for `new_entity_review` cases before
 * a human ever sees the item. Writes append-only rows to identity_enrichment_runs
 * and keeps review_queue lightweight with rolled-up routing state.
 *
 * Pipeline order (each step writes one identity_enrichment_runs row):
 *   1. Google candidate search  (name+city variants)
 *   2. GPID detection           (from Google search results)
 *   3. Website discovery        (from Google result or place details)
 *   4. Instagram discovery      (from Google result or website scrape)
 *   5. Corroboration            (reservation provider, category, neighborhood, phone)
 *
 * After each step the v1 sufficiency matrix is evaluated. If a rule fires the
 * queue item is auto-resolved as 'sufficient' and the function returns early.
 */

import { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DecisionStatus = 'sufficient' | 'needs_review' | 'unresolved';

interface RawRecord {
  raw_id: string;
  name_normalized: string | null;
  raw_json: any;
  lat: Prisma.Decimal | null;
  lng: Prisma.Decimal | null;
}

interface AnchorSet {
  gpid: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  verifiedAddress: string | null;
  phone: string | null;
  category: string | null;
  neighborhood: string | null;
  reservationProvider: string | null;
  mediaMentions: string[];
}

interface SufficiencyResult {
  sufficient: boolean;
  ruleFired: string | null;
  confidence: number;
  anchorCount: number;
}

// ---------------------------------------------------------------------------
// String similarity (Jaro-Winkler, same impl as resolver-pipeline)
// ---------------------------------------------------------------------------

function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

  let matches = 0;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/['"'`]/g, '')
    .replace(/\b(restaurant|cafe|bar|grill|kitchen|eatery|bistro)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(city: string | null | undefined): string {
  if (!city) return '';
  return city.toLowerCase().trim();
}

/** Jaro-Winkler ≥ 0.85 = near-exact match */
function isNearExactName(candidateName: string, recordName: string): boolean {
  const norm1 = normalizeName(candidateName);
  const norm2 = normalizeName(recordName);
  if (norm1 === norm2) return true;
  return jaroWinklerSimilarity(norm1, norm2) >= 0.85;
}

function cityMatches(candidateCity: string | null, searchedCity: string | null): boolean {
  if (!candidateCity || !searchedCity) return false;
  return normalizeCity(candidateCity) === normalizeCity(searchedCity);
}

// ---------------------------------------------------------------------------
// Anchor weight table
// Max theoretical score: GPID(4) + website(3) + instagram(2) + address(2) + 4 corroborators(1 each) = 15
// We cap at 10 for a normalized 0–1 scale (GPID+website+instagram+address+2 corroborators)
// ---------------------------------------------------------------------------

const ANCHOR_WEIGHTS: Record<string, number> = {
  gpid: 4,
  website: 3,
  instagram: 2,
  tiktok: 2,
  verifiedAddress: 2,
  reservationProvider: 1,
  mediaMention: 1,
  matchingCategory: 1,
  matchingNeighborhood: 1,
  matchingPhone: 1,
};
const MAX_WEIGHT = 10;

function computeConfidence(anchors: AnchorSet, recordJson: any): number {
  let weight = 0;
  if (anchors.gpid) weight += ANCHOR_WEIGHTS.gpid;
  if (anchors.website) weight += ANCHOR_WEIGHTS.website;
  if (anchors.instagram) weight += ANCHOR_WEIGHTS.instagram;
  if (anchors.verifiedAddress) weight += ANCHOR_WEIGHTS.verifiedAddress;
  if (anchors.reservationProvider) weight += ANCHOR_WEIGHTS.reservationProvider;
  if (anchors.mediaMentions.length > 0) weight += ANCHOR_WEIGHTS.mediaMention;
  if (anchors.category && recordJson?.category &&
      anchors.category.toLowerCase() === recordJson.category.toLowerCase())
    weight += ANCHOR_WEIGHTS.matchingCategory;
  if (anchors.neighborhood && recordJson?.neighborhood &&
      normalizeCity(anchors.neighborhood) === normalizeCity(recordJson.neighborhood))
    weight += ANCHOR_WEIGHTS.matchingNeighborhood;
  if (anchors.phone && recordJson?.phone &&
      anchors.phone.replace(/\D/g, '') === recordJson.phone.replace(/\D/g, ''))
    weight += ANCHOR_WEIGHTS.matchingPhone;

  return Math.min(weight / MAX_WEIGHT, 1.0);
}

function countAnchors(anchors: AnchorSet): number {
  let n = 0;
  if (anchors.gpid) n++;
  if (anchors.website) n++;
  if (anchors.instagram) n++;
  if (anchors.verifiedAddress) n++;
  if (anchors.reservationProvider) n++;
  if (anchors.mediaMentions.length > 0) n++;
  if (anchors.phone) n++;
  if (anchors.category) n++;
  if (anchors.neighborhood) n++;
  return n;
}

// ---------------------------------------------------------------------------
// V1 Sufficiency Matrix
//
// RULE 1: GPID + near-exact name
// RULE 2: website + near-exact name + city match
// RULE 3: instagram + near-exact name + city match + ≥1 corroborator
// RULE 4: verified address + near-exact name + (website OR gpid)
// ---------------------------------------------------------------------------

function evaluateSufficiency(
  anchors: AnchorSet,
  candidateName: string,
  candidateCity: string | null,
  searchedCity: string | null,
  recordName: string,
  recordJson: any,
): SufficiencyResult {
  const nameOk = isNearExactName(candidateName, recordName);
  const cityOk = cityMatches(candidateCity, searchedCity);
  const confidence = computeConfidence(anchors, recordJson);
  const anchorCount = countAnchors(anchors);

  const corroboratorCount =
    (anchors.reservationProvider ? 1 : 0) +
    (anchors.mediaMentions.length > 0 ? 1 : 0) +
    (anchors.category && recordJson?.category &&
     anchors.category.toLowerCase() === recordJson.category.toLowerCase() ? 1 : 0) +
    (anchors.neighborhood && recordJson?.neighborhood &&
     normalizeCity(anchors.neighborhood) === normalizeCity(recordJson.neighborhood) ? 1 : 0) +
    (anchors.phone && recordJson?.phone &&
     anchors.phone.replace(/\D/g, '') === recordJson.phone.replace(/\D/g, '') ? 1 : 0);

  // RULE 1
  if (anchors.gpid && nameOk) {
    return { sufficient: true, ruleFired: 'rule1_gpid_name', confidence, anchorCount };
  }

  // RULE 2
  if (anchors.website && nameOk && cityOk) {
    return { sufficient: true, ruleFired: 'rule2_website_name_city', confidence, anchorCount };
  }

  // RULE 3
  if (anchors.instagram && nameOk && cityOk && corroboratorCount >= 1) {
    return { sufficient: true, ruleFired: 'rule3_instagram_name_city_corr', confidence, anchorCount };
  }

  // RULE 4
  if (anchors.verifiedAddress && nameOk && (anchors.website || anchors.gpid)) {
    return { sufficient: true, ruleFired: 'rule4_address_name_anchor', confidence, anchorCount };
  }

  return { sufficient: false, ruleFired: null, confidence, anchorCount };
}

// ---------------------------------------------------------------------------
// Google Places Text Search
// ---------------------------------------------------------------------------

async function googleTextSearch(
  query: string,
  apiKey: string,
): Promise<any[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return data.results ?? [];
    }
    console.warn(`[identity-enrichment] Google text search non-OK status: ${data.status}`);
    return [];
  } catch (err) {
    console.warn('[identity-enrichment] Google text search failed:', err);
    return [];
  }
}

async function googlePlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<any | null> {
  const fields = 'name,formatted_address,website,formatted_phone_number,types,address_components';
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') return data.result;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write one enrichment run row
// ---------------------------------------------------------------------------

async function writeRun(params: {
  rawId: string;
  reviewQueueId: string;
  sourceName: string;
  searchedName: string | null;
  searchedCity: string | null;
  resultJson: object;
  identityConfidence: number;
  anchorCount: number;
  decisionStatus: DecisionStatus;
}): Promise<string> {
  const run = await prisma.identity_enrichment_runs.create({
    data: {
      raw_id: params.rawId,
      review_queue_id: params.reviewQueueId,
      source_name: params.sourceName,
      searched_name: params.searchedName,
      searched_city: params.searchedCity,
      result_json: params.resultJson as Prisma.InputJsonValue,
      identity_confidence: new Prisma.Decimal(params.identityConfidence.toFixed(3)),
      anchor_count: params.anchorCount,
      decision_status: params.decisionStatus,
    },
  });
  return run.id;
}

// ---------------------------------------------------------------------------
// Update review_queue routing state
// ---------------------------------------------------------------------------

async function updateQueueEnrichmentState(params: {
  queueId: string;
  status: string;
  anchorCount: number;
  confidence: number;
  latestRunId: string;
}) {
  await prisma.review_queue.update({
    where: { queue_id: params.queueId },
    data: {
      identity_enrichment_status: params.status,
      identity_anchor_count: params.anchorCount,
      latest_identity_confidence: new Prisma.Decimal(params.confidence.toFixed(3)),
      latest_identity_run_id: params.latestRunId,
    },
  });
}

// ---------------------------------------------------------------------------
// Main enrichment runner
// ---------------------------------------------------------------------------

/**
 * Run the pre-review identity enrichment gate for a single new_entity_review record.
 *
 * Call immediately after createReviewQueueItem() for new_entity_review cases.
 * The function runs all enrichment steps in cheap-first order and updates the
 * queue row with the final routing state. It does NOT change queue.status —
 * 'sufficient' cases are marked resolved by the caller after this returns.
 *
 * Returns the final DecisionStatus so the caller can decide next action.
 */
export async function runIdentityEnrichment(
  record: RawRecord,
  queueId: string,
): Promise<DecisionStatus> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[identity-enrichment] GOOGLE_MAPS_API_KEY not set — skipping enrichment, marking unresolved');
    const runId = await writeRun({
      rawId: record.raw_id,
      reviewQueueId: queueId,
      sourceName: 'google_candidate_search',
      searchedName: record.name_normalized,
      searchedCity: null,
      resultJson: { error: 'GOOGLE_MAPS_API_KEY not set' },
      identityConfidence: 0,
      anchorCount: 0,
      decisionStatus: 'unresolved',
    });
    await updateQueueEnrichmentState({
      queueId,
      status: 'unresolved',
      anchorCount: 0,
      confidence: 0,
      latestRunId: runId,
    });
    return 'unresolved';
  }

  const rawJson = record.raw_json as any;
  const recordName = rawJson?.name ?? record.name_normalized ?? '';
  const recordCity = rawJson?.address_city ?? rawJson?.city ?? null;
  const recordCategory = rawJson?.category ?? null;
  const recordNeighborhood = rawJson?.neighborhood ?? null;
  const recordPhone = rawJson?.phone ?? null;

  // Accumulated anchors across all steps
  const anchors: AnchorSet = {
    gpid: rawJson?.google_place_id ?? null,
    website: rawJson?.website ?? null,
    instagram: rawJson?.instagram ?? rawJson?.instagram_handle ?? null,
    tiktok: rawJson?.tiktok ?? null,
    verifiedAddress: null,
    phone: recordPhone,
    category: recordCategory,
    neighborhood: recordNeighborhood,
    reservationProvider: null,
    mediaMentions: [],
  };

  let bestCandidate: any = null;
  let bestCandidateName = recordName;
  let bestCandidateCity = recordCity;

  // Mark as enriching
  await prisma.review_queue.update({
    where: { queue_id: queueId },
    data: { identity_enrichment_status: 'enriching' },
  });

  // -----------------------------------------------------------------------
  // STEP 1: Google candidate search (three query variants)
  // -----------------------------------------------------------------------
  const searchQueries: string[] = [];
  if (recordName && recordCity) {
    searchQueries.push(`${recordName} ${recordCity}`);
    if (recordCategory) searchQueries.push(`${recordName} ${recordCategory} ${recordCity}`);
    if (recordNeighborhood) searchQueries.push(`${recordName} ${recordNeighborhood} ${recordCity}`);
  } else if (recordName) {
    searchQueries.push(recordName);
  }

  let googleResults: any[] = [];
  for (const q of searchQueries) {
    const results = await googleTextSearch(q, apiKey);
    if (results.length > 0) {
      googleResults = results;
      break; // use first query that returns results
    }
  }

  // Pick best matching result by name similarity
  let bestGoogleScore = 0;
  for (const result of googleResults) {
    const sim = jaroWinklerSimilarity(
      normalizeName(result.name),
      normalizeName(recordName),
    );
    if (sim > bestGoogleScore) {
      bestGoogleScore = sim;
      bestCandidate = result;
      bestCandidateName = result.name;
    }
  }

  const step1Confidence = computeConfidence(anchors, rawJson);
  const step1Status: DecisionStatus =
    anchors.gpid && isNearExactName(recordName, recordName)
      ? 'sufficient'
      : bestCandidate ? 'needs_review' : 'unresolved';

  const step1RunId = await writeRun({
    rawId: record.raw_id,
    reviewQueueId: queueId,
    sourceName: 'google_candidate_search',
    searchedName: recordName,
    searchedCity: recordCity,
    resultJson: {
      queries: searchQueries,
      results: googleResults.slice(0, 5).map((r) => ({
        name: r.name,
        place_id: r.place_id,
        formatted_address: r.formatted_address,
        types: r.types,
        similarity: jaroWinklerSimilarity(normalizeName(r.name), normalizeName(recordName)),
      })),
      best_candidate_name: bestCandidateName,
      best_score: bestGoogleScore,
    },
    identityConfidence: step1Confidence,
    anchorCount: countAnchors(anchors),
    decisionStatus: step1Status,
  });

  await updateQueueEnrichmentState({
    queueId,
    status: 'enriching',
    anchorCount: countAnchors(anchors),
    confidence: step1Confidence,
    latestRunId: step1RunId,
  });

  // -----------------------------------------------------------------------
  // STEP 2: GPID detection from Google result
  // -----------------------------------------------------------------------
  if (bestCandidate?.place_id && !anchors.gpid) {
    anchors.gpid = bestCandidate.place_id;
  }

  // Fetch place details for the best candidate to get website / phone / address
  let placeDetails: any = null;
  if (bestCandidate?.place_id) {
    placeDetails = await googlePlaceDetails(bestCandidate.place_id, apiKey);
    if (placeDetails) {
      bestCandidateCity =
        placeDetails.address_components?.find((c: any) => c.types.includes('locality'))?.long_name ??
        bestCandidateCity;
      if (placeDetails.website && !anchors.website) anchors.website = placeDetails.website;
      if (placeDetails.formatted_phone_number && !anchors.phone)
        anchors.phone = placeDetails.formatted_phone_number;
      if (placeDetails.formatted_address && !anchors.verifiedAddress)
        anchors.verifiedAddress = placeDetails.formatted_address;
    }
  }

  const step2Confidence = computeConfidence(anchors, rawJson);
  const step2Sufficiency = anchors.gpid
    ? evaluateSufficiency(anchors, bestCandidateName, bestCandidateCity, recordCity, recordName, rawJson)
    : { sufficient: false, ruleFired: null, confidence: step2Confidence, anchorCount: countAnchors(anchors) };

  const step2RunId = await writeRun({
    rawId: record.raw_id,
    reviewQueueId: queueId,
    sourceName: 'gpid_detection',
    searchedName: recordName,
    searchedCity: recordCity,
    resultJson: {
      gpid_found: anchors.gpid,
      place_details: placeDetails
        ? {
            name: placeDetails.name,
            website: placeDetails.website,
            phone: placeDetails.formatted_phone_number,
            address: placeDetails.formatted_address,
          }
        : null,
      sufficiency_check: step2Sufficiency,
    },
    identityConfidence: step2Confidence,
    anchorCount: countAnchors(anchors),
    decisionStatus: step2Sufficiency.sufficient ? 'sufficient' : 'needs_review',
  });

  if (step2Sufficiency.sufficient) {
    await updateQueueEnrichmentState({
      queueId,
      status: 'sufficient',
      anchorCount: step2Sufficiency.anchorCount,
      confidence: step2Sufficiency.confidence,
      latestRunId: step2RunId,
    });
    return 'sufficient';
  }

  await updateQueueEnrichmentState({
    queueId,
    status: 'enriching',
    anchorCount: countAnchors(anchors),
    confidence: step2Confidence,
    latestRunId: step2RunId,
  });

  // -----------------------------------------------------------------------
  // STEP 3: Website discovery (already populated from place details above)
  // -----------------------------------------------------------------------
  const step3Confidence = computeConfidence(anchors, rawJson);
  const step3Sufficiency = anchors.website
    ? evaluateSufficiency(anchors, bestCandidateName, bestCandidateCity, recordCity, recordName, rawJson)
    : { sufficient: false, ruleFired: null, confidence: step3Confidence, anchorCount: countAnchors(anchors) };

  const step3RunId = await writeRun({
    rawId: record.raw_id,
    reviewQueueId: queueId,
    sourceName: 'website_discovery',
    searchedName: recordName,
    searchedCity: recordCity,
    resultJson: {
      website_found: anchors.website,
      source: placeDetails?.website ? 'google_place_details' : 'raw_record',
      sufficiency_check: step3Sufficiency,
    },
    identityConfidence: step3Confidence,
    anchorCount: countAnchors(anchors),
    decisionStatus: step3Sufficiency.sufficient ? 'sufficient' : 'needs_review',
  });

  if (step3Sufficiency.sufficient) {
    await updateQueueEnrichmentState({
      queueId,
      status: 'sufficient',
      anchorCount: step3Sufficiency.anchorCount,
      confidence: step3Sufficiency.confidence,
      latestRunId: step3RunId,
    });
    return 'sufficient';
  }

  await updateQueueEnrichmentState({
    queueId,
    status: 'enriching',
    anchorCount: countAnchors(anchors),
    confidence: step3Confidence,
    latestRunId: step3RunId,
  });

  // -----------------------------------------------------------------------
  // STEP 4: Instagram discovery
  // Look for instagram handle in raw_json or website URL patterns
  // -----------------------------------------------------------------------
  if (!anchors.instagram && anchors.website) {
    // Simple heuristic: if website domain contains "instagram" or links to it
    if (/instagram\.com\/([^/?#]+)/i.test(anchors.website)) {
      const match = anchors.website.match(/instagram\.com\/([^/?#]+)/i);
      if (match) anchors.instagram = match[1];
    }
  }

  const step4Confidence = computeConfidence(anchors, rawJson);
  const step4Sufficiency = anchors.instagram
    ? evaluateSufficiency(anchors, bestCandidateName, bestCandidateCity, recordCity, recordName, rawJson)
    : { sufficient: false, ruleFired: null, confidence: step4Confidence, anchorCount: countAnchors(anchors) };

  const step4RunId = await writeRun({
    rawId: record.raw_id,
    reviewQueueId: queueId,
    sourceName: 'instagram_discovery',
    searchedName: recordName,
    searchedCity: recordCity,
    resultJson: {
      instagram_found: anchors.instagram,
      source: rawJson?.instagram ? 'raw_record' : anchors.instagram ? 'website_parse' : null,
      sufficiency_check: step4Sufficiency,
    },
    identityConfidence: step4Confidence,
    anchorCount: countAnchors(anchors),
    decisionStatus: step4Sufficiency.sufficient ? 'sufficient' : 'needs_review',
  });

  if (step4Sufficiency.sufficient) {
    await updateQueueEnrichmentState({
      queueId,
      status: 'sufficient',
      anchorCount: step4Sufficiency.anchorCount,
      confidence: step4Sufficiency.confidence,
      latestRunId: step4RunId,
    });
    return 'sufficient';
  }

  await updateQueueEnrichmentState({
    queueId,
    status: 'enriching',
    anchorCount: countAnchors(anchors),
    confidence: step4Confidence,
    latestRunId: step4RunId,
  });

  // -----------------------------------------------------------------------
  // STEP 5: Corroboration check
  // Look for reservation provider signals in Google types or known patterns
  // -----------------------------------------------------------------------
  const googleTypes: string[] = placeDetails?.types ?? bestCandidate?.types ?? [];
  const candidateCategory = googleTypes.length > 0
    ? googleTypes[0].split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;
  if (candidateCategory && !anchors.category) anchors.category = candidateCategory;

  // Reservation provider heuristic: Google type includes lodging/restaurant near resy/opentable patterns
  // This is kept lightweight — no API call. Just check if raw_json has a reservation URL
  if (rawJson?.reservation_url && !anchors.reservationProvider) {
    anchors.reservationProvider = rawJson.reservation_url;
  }

  const step5Confidence = computeConfidence(anchors, rawJson);
  const step5Sufficiency = evaluateSufficiency(
    anchors,
    bestCandidateName,
    bestCandidateCity,
    recordCity,
    recordName,
    rawJson,
  );

  const finalDecision: DecisionStatus = step5Sufficiency.sufficient
    ? 'sufficient'
    : countAnchors(anchors) > 0
      ? 'needs_review'
      : 'unresolved';

  const step5RunId = await writeRun({
    rawId: record.raw_id,
    reviewQueueId: queueId,
    sourceName: 'corroboration',
    searchedName: recordName,
    searchedCity: recordCity,
    resultJson: {
      category_found: anchors.category,
      neighborhood_found: anchors.neighborhood,
      phone_found: anchors.phone,
      reservation_provider: anchors.reservationProvider,
      media_mentions: anchors.mediaMentions,
      final_anchors: anchors,
      sufficiency_check: step5Sufficiency,
      final_decision: finalDecision,
    },
    identityConfidence: step5Confidence,
    anchorCount: countAnchors(anchors),
    decisionStatus: finalDecision,
  });

  await updateQueueEnrichmentState({
    queueId,
    status: finalDecision,
    anchorCount: countAnchors(anchors),
    confidence: step5Confidence,
    latestRunId: step5RunId,
  });

  return finalDecision;
}
