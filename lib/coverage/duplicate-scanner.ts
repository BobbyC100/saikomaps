/**
 * Duplicate Entity Scanner — Coverage Operations
 *
 * Pairwise comparison of entities to detect probable duplicates.
 * Runs separately from the per-entity issue scanner because it's O(n²).
 *
 * Detection signals:
 *   1. Fuzzy name matching (normalized token overlap / containment)
 *   2. GPID overlap (exact or substring match — catches truncation bugs)
 *   3. Coordinate proximity (~100m / ~0.001 degrees)
 *   4. Same social handle (Instagram or TikTok)
 *
 * Creates entity_issues with issue_type='potential_duplicate', one per pair,
 * on the entity with less data or the one created later.
 */

import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuplicateEntity {
  id: string;
  slug: string;
  name: string;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  instagram: string | null;
  tiktok: string | null;
  ces_instagram: string | null;
  ces_tiktok: string | null;
  createdAt: Date;
  /** Rough "data richness" score for tie-breaking */
  dataScore: number;
}

interface DuplicatePair {
  /** Entity that gets the issue (less data or newer) */
  entity: DuplicateEntity;
  /** The entity it's a duplicate of */
  duplicateOf: DuplicateEntity;
  matchReasons: string[];
}

export interface DuplicateScanSummary {
  entitiesCompared: number;
  pairsFound: number;
  issuesCreated: number;
  issuesResolved: number;
  issuesUnchanged: number;
  pairs: { slug: string; duplicateOfSlug: string; reasons: string[] }[];
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

/** Suffixes and noise words to strip for comparison */
const STRIP_WORDS = new Set([
  'restaurant', 'restaurants', 'cafe', 'coffee', 'bar', 'grill',
  'kitchen', 'los', 'angeles', 'la', 'the', 'and', '&',
  'inc', 'llc', 'co',
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')        // smart quotes
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STRIP_WORDS.has(w))
    .sort()
    .join(' ')
    .trim();
}

/** Check if two names are likely the same entity */
function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (!na || !nb) return false;

  // Exact match after normalization
  if (na === nb) return true;

  // One contains the other (handles "Alba" vs "Alba LA" after stripping)
  if (na.includes(nb) || nb.includes(na)) return true;

  // Token overlap: if all tokens of the shorter are in the longer
  const tokensA = na.split(' ');
  const tokensB = nb.split(' ');
  const [shorter, longer] = tokensA.length <= tokensB.length
    ? [tokensA, new Set(tokensB)]
    : [tokensB, new Set(tokensA)];

  if (shorter.length >= 2 && shorter.every((t) => longer.has(t))) return true;

  return false;
}

// ---------------------------------------------------------------------------
// GPID matching
// ---------------------------------------------------------------------------

function gpidsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Substring match (catches truncation)
  if (a.length >= 10 && b.length >= 10) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Coordinate proximity (~100m)
// ---------------------------------------------------------------------------

const COORD_THRESHOLD = 0.001; // ~111m at equator

function coordsClose(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null,
): boolean {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return false;
  return (
    Math.abs(lat1 - lat2) < COORD_THRESHOLD &&
    Math.abs(lng1 - lng2) < COORD_THRESHOLD
  );
}

// ---------------------------------------------------------------------------
// Social handle matching
// ---------------------------------------------------------------------------

function normalizeHandle(h: string | null): string | null {
  if (!h || h === 'NONE') return null;
  return h.replace(/^@/, '').toLowerCase().trim() || null;
}

function socialsMatch(entity1: DuplicateEntity, entity2: DuplicateEntity): string | null {
  const ig1 = normalizeHandle(entity1.ces_instagram ?? entity1.instagram);
  const ig2 = normalizeHandle(entity2.ces_instagram ?? entity2.instagram);
  if (ig1 && ig2 && ig1 === ig2) return `same_instagram:@${ig1}`;

  const tt1 = normalizeHandle(entity1.ces_tiktok ?? entity1.tiktok);
  const tt2 = normalizeHandle(entity2.ces_tiktok ?? entity2.tiktok);
  if (tt1 && tt2 && tt1 === tt2) return `same_tiktok:@${tt1}`;

  return null;
}

// ---------------------------------------------------------------------------
// Data richness score (for tie-breaking)
// ---------------------------------------------------------------------------

function computeDataScore(raw: {
  googlePlaceId: string | null;
  latitude: unknown;
  longitude: unknown;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  phone: string | null;
  neighborhood: string | null;
  ces_website: string | null;
  ces_instagram: string | null;
  ces_tiktok: string | null;
  ces_phone: string | null;
  surfaceCount: number;
}): number {
  let score = 0;
  if (raw.googlePlaceId) score += 3;
  if (raw.latitude && raw.longitude) score += 2;
  if (raw.website || raw.ces_website) score += 2;
  if (raw.instagram || raw.ces_instagram) score += 2;
  if (raw.tiktok || raw.ces_tiktok) score += 1;
  if (raw.phone || raw.ces_phone) score += 1;
  if (raw.neighborhood) score += 1;
  score += Math.min(raw.surfaceCount, 5); // cap surface bonus
  return score;
}

// ---------------------------------------------------------------------------
// Main scanner
// ---------------------------------------------------------------------------

export async function scanForDuplicates(
  prisma: PrismaClient,
  options: { dryRun?: boolean; verbose?: boolean } = {},
): Promise<DuplicateScanSummary> {
  const { dryRun = false, verbose = false } = options;

  // Fetch entities in Coverage-Ops scope using three-axis states, with legacy fallback.
  const rawEntities = await prisma.entities.findMany({
    where: {
      OR: [
        { enrichmentStatus: { in: ['INGESTED', 'ENRICHING', 'ENRICHED'] } },
        { enrichmentStatus: null, status: { not: 'CANDIDATE' } },
      ],
      NOT: {
        OR: [
          { operatingStatus: 'PERMANENTLY_CLOSED' },
          { operatingStatus: null, status: 'PERMANENTLY_CLOSED' },
        ],
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      googlePlaceId: true,
      latitude: true,
      longitude: true,
      instagram: true,
      tiktok: true,
      website: true,
      phone: true,
      neighborhood: true,
      createdAt: true,
      canonical_state: {
        select: {
          website: true,
          instagram: true,
          tiktok: true,
          phone: true,
        },
      },
      _count: {
        select: { merchant_surfaces: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const entities: DuplicateEntity[] = rawEntities.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    googlePlaceId: r.googlePlaceId,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    instagram: r.instagram,
    tiktok: r.tiktok,
    ces_instagram: r.canonical_state?.instagram ?? null,
    ces_tiktok: r.canonical_state?.tiktok ?? null,
    createdAt: r.createdAt,
    dataScore: computeDataScore({
      googlePlaceId: r.googlePlaceId,
      latitude: r.latitude,
      longitude: r.longitude,
      instagram: r.instagram,
      tiktok: r.tiktok,
      website: r.website,
      phone: r.phone,
      neighborhood: r.neighborhood,
      ces_website: r.canonical_state?.website ?? null,
      ces_instagram: r.canonical_state?.instagram ?? null,
      ces_tiktok: r.canonical_state?.tiktok ?? null,
      ces_phone: r.canonical_state?.phone ?? null,
      surfaceCount: r._count.merchant_surfaces,
    }),
  }));

  // Pairwise comparison
  const pairs: DuplicatePair[] = [];
  const seenPairs = new Set<string>(); // "id1|id2" to avoid double-reporting

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      const reasons: string[] = [];

      // 1. Name match
      if (namesMatch(a.name, b.name)) reasons.push('similar_name');

      // 2. GPID overlap
      if (gpidsMatch(a.googlePlaceId, b.googlePlaceId)) reasons.push('gpid_overlap');

      // 3. Coordinate proximity
      if (coordsClose(a.latitude, a.longitude, b.latitude, b.longitude)) reasons.push('coords_within_100m');

      // 4. Social handle match
      const socialMatch = socialsMatch(a, b);
      if (socialMatch) reasons.push(socialMatch);

      // Need at least 1 strong signal, or 2+ weak signals.
      // In a dense city like LA, coords_within_100m alone produces many false positives
      // (different restaurants on the same block). Require a second signal.
      if (reasons.length === 0) continue;
      if (reasons.length === 1) {
        if (reasons[0] === 'coords_within_100m') continue; // proximity alone = not enough
        if (reasons[0] === 'similar_name') {
          // Name-only match: only flag if normalized names are identical
          const na = normalizeName(a.name);
          const nb = normalizeName(b.name);
          if (na !== nb) continue;
        }
      }

      const pairKey = [a.id, b.id].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      // Assign issue to the entity with less data; if tied, the newer one
      let issueEntity: DuplicateEntity;
      let duplicateOf: DuplicateEntity;
      if (a.dataScore !== b.dataScore) {
        issueEntity = a.dataScore < b.dataScore ? a : b;
        duplicateOf = a.dataScore < b.dataScore ? b : a;
      } else {
        issueEntity = a.createdAt > b.createdAt ? a : b;
        duplicateOf = a.createdAt > b.createdAt ? b : a;
      }

      pairs.push({ entity: issueEntity, duplicateOf, matchReasons: reasons });
    }
  }

  if (verbose) {
    console.log(`[DuplicateScanner] ${entities.length} entities, ${pairs.length} potential duplicates found`);
  }

  // Now upsert entity_issues for each pair
  // First, get all existing potential_duplicate issues
  const existingDupIssues = await prisma.entity_issues.findMany({
    where: { issueType: 'potential_duplicate' },
  });

  // Build a map: entity_id -> existing issue(s)
  const existingByEntity = new Map<string, typeof existingDupIssues>();
  for (const issue of existingDupIssues) {
    const list = existingByEntity.get(issue.entityId) ?? [];
    list.push(issue);
    existingByEntity.set(issue.entityId, list);
  }

  // Track which existing issues are still valid (to resolve stale ones)
  const stillValidIssueIds = new Set<string>();

  const summary: DuplicateScanSummary = {
    entitiesCompared: entities.length,
    pairsFound: pairs.length,
    issuesCreated: 0,
    issuesResolved: 0,
    issuesUnchanged: 0,
    pairs: [],
  };

  for (const pair of pairs) {
    const detail = {
      duplicate_of_id: pair.duplicateOf.id,
      duplicate_of_slug: pair.duplicateOf.slug,
      duplicate_of_name: pair.duplicateOf.name,
      match_reasons: pair.matchReasons,
    };

    // Check if an existing issue already covers this pair
    const existingForEntity = existingByEntity.get(pair.entity.id) ?? [];
    const matchingExisting = existingForEntity.find((e) => {
      const d = e.detail as Record<string, unknown> | null;
      return d?.duplicate_of_id === pair.duplicateOf.id;
    });

    if (matchingExisting) {
      stillValidIssueIds.add(matchingExisting.id);
      if (matchingExisting.status === 'suppressed') {
        summary.issuesUnchanged++;
      } else if (matchingExisting.status === 'resolved') {
        // Re-open if resolved but still detected
        if (!dryRun) {
          await prisma.entity_issues.update({
            where: { id: matchingExisting.id },
            data: { status: 'open', resolvedAt: null, resolvedBy: null, detail },
          });
        }
        summary.issuesCreated++;
      } else {
        // Already open — update detail in case reasons changed
        if (!dryRun) {
          await prisma.entity_issues.update({
            where: { id: matchingExisting.id },
            data: { detail },
          });
        }
        summary.issuesUnchanged++;
      }
    } else {
      // New duplicate issue — use upsert since (entity_id, issue_type) is unique
      // and this entity may already have a duplicate issue for a different pair.
      // In that case, update the existing issue with the new pair info.
      if (!dryRun) {
        await prisma.entity_issues.upsert({
          where: {
            entityId_issueType: {
              entityId: pair.entity.id,
              issueType: 'potential_duplicate',
            },
          },
          create: {
            entityId: pair.entity.id,
            problemClass: 'identity',
            issueType: 'potential_duplicate',
            status: 'open',
            severity: 'high',
            blockingPublish: false,
            recommendedTool: 'merge_entities',
            detail,
          },
          update: {
            status: 'open',
            detail,
            resolvedAt: null,
            resolvedBy: null,
          },
        });
      }
      summary.issuesCreated++;
      if (verbose) {
        console.log(
          `  NEW  ${pair.entity.slug} ↔ ${pair.duplicateOf.slug}: ${pair.matchReasons.join(', ')}`,
        );
      }
    }

    summary.pairs.push({
      slug: pair.entity.slug,
      duplicateOfSlug: pair.duplicateOf.slug,
      reasons: pair.matchReasons,
    });
  }

  // Resolve stale duplicate issues (pair no longer detected)
  for (const issue of existingDupIssues) {
    if (stillValidIssueIds.has(issue.id)) continue;
    if (['resolved', 'suppressed'].includes(issue.status)) continue;

    if (!dryRun) {
      await prisma.entity_issues.update({
        where: { id: issue.id },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: 'SCANNER' },
      });
    }
    summary.issuesResolved++;
    if (verbose) {
      console.log(`  RESOLVED stale duplicate issue ${issue.id}`);
    }
  }

  return summary;
}
