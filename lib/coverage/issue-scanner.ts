/**
 * Entity Issue Scanner — Coverage Operations Issue Generator
 *
 * Scans entities and generates/updates entity_issues rows.
 * Converts pipeline signals into operator-facing tasks.
 *
 * Design principles (from COVOPS-APPROACH-V1):
 * - Issue types represent operator problems, not schema fields
 * - Suppressed issues (confirmed_none) are never recreated
 * - Resolved issues are re-opened if the problem recurs
 * - One issue per (entity_id, issue_type) via upsert
 *
 * Nomadic / pop-up entity handling:
 *   Entities with place_appearances rows are treated as nomadic.
 *   Nomadic entities have relaxed thresholds:
 *   - Identity threshold lowered from 4 to 2 (name + Instagram = sufficient)
 *   - missing_gpid, missing_coords, missing_neighborhood, missing_hours suppressed
 *   - Location-dependent issues don't apply (location comes from appearances)
 *
 * Issue types and detection rules:
 *   identity / unresolved_identity    — insufficient identity anchors (critical, blocking)
 *   identity / missing_gpid           — no GPID but identity sufficient (medium, non-blocking)
 *   identity / enrichment_incomplete  — has GPID but never enriched (high, blocking)
 *   location / missing_coords         — has GPID but no lat/lng (high, blocking)
 *   location / missing_neighborhood   — has coords but no neighborhood (medium)
 *   location / missing_hours          — no canonical/entity hours for hours-applicable verticals (medium)
 *   location / missing_price_level    — no canonical/entity price level for food/drink entities (low)
 *   location / missing_menu_link      — no canonical menu URL for food/drink entities (low)
 *   location / missing_reservations   — no canonical/entity reservation URL for reservation-likely entities (low)
 *   location / operating_status_unknown — has GPID but no Google businessStatus (medium)
 *   contact  / missing_website        — no website in CES (medium)
 *   contact  / missing_phone          — no phone in CES (low)
 *   social   / missing_instagram      — no instagram, not confirmed NONE (low)
 *   social   / missing_tiktok         — no tiktok, not confirmed NONE (low)
 *   identity / google_says_closed     — Google businessStatus is CLOSED_TEMPORARILY or CLOSED_PERMANENTLY (high)
 */

import { PrismaClient, Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IssueRule {
  issueType: string;
  problemClass: 'identity' | 'location' | 'contact' | 'social' | 'editorial';
  severity: 'critical' | 'high' | 'medium' | 'low';
  blockingPublish: boolean;
  recommendedTool: string | null;
  /** Return true if this entity has the problem, or null/detail object with context */
  detect: (entity: ScanEntity) => IssueDetail | null;
}

export interface IssueDetail {
  detected: true;
  detail?: Record<string, unknown>;
}

export interface ScanEntity {
  id: string;
  slug: string;
  name: string;
  status: string;
  primaryVertical: string | null;
  googlePlaceId: string | null;
  latitude: unknown;
  longitude: unknown;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  hours: unknown;
  priceLevel: number | null;
  reservationUrl: string | null;
  instagram: string | null;
  tiktok: string | null;
  enrichmentStage: string | null;
  lastEnrichedAt: Date | null;
  // CES fields (may be null if no CES row)
  cesWebsite: string | null;
  cesPhone: string | null;
  cesHoursJson: unknown;
  cesPriceLevel: number | null;
  cesReservationUrl: string | null;
  cesMenuUrl: string | null;
  cesInstagram: string | null;
  cesTiktok: string | null;
  cesNeighborhood: string | null;
  cesEventsUrl: string | null;
  businessStatus: string | null;
  // Surface scan hints
  hasEventsSurface: boolean;
  // Nomadic / pop-up — derived from place_appearances
  isNomadic: boolean;
}

export interface ScanResult {
  entityId: string;
  slug: string;
  name: string;
  issuesCreated: number;
  issuesResolved: number;
  issuesUnchanged: number;
}

export interface ScanSummary {
  entitiesScanned: number;
  issuesCreated: number;
  issuesResolved: number;
  issuesUnchanged: number;
  byType: Record<string, number>;
  results: ScanResult[];
}

const IDENTITY_ANCHOR_WEIGHTS = {
  website: 3,
  instagram: 2,
  tiktok: 2,
  phone: 1,
  neighborhood: 1,
  coords: 2,
} as const;

type IdentityAnchorKey = keyof typeof IDENTITY_ANCHOR_WEIGHTS;

function getIdentityAnchorState(entity: ScanEntity) {
  const anchors: Record<IdentityAnchorKey, boolean> = {
    website: Boolean(entity.website || entity.cesWebsite),
    instagram: Boolean(entity.instagram || entity.cesInstagram),
    tiktok: Boolean(entity.tiktok || entity.cesTiktok),
    phone: Boolean(entity.phone || entity.cesPhone),
    neighborhood: Boolean(entity.neighborhood || entity.cesNeighborhood),
    coords: Boolean(entity.latitude && entity.longitude),
  };

  const score = (Object.keys(anchors) as IdentityAnchorKey[]).reduce((sum, key) => {
    return sum + (anchors[key] ? IDENTITY_ANCHOR_WEIGHTS[key] : 0);
  }, 0);

  return { anchors, score };
}

function getFastestIdentityFixes(
  anchors: Record<IdentityAnchorKey, boolean>,
  pointsNeeded: number,
): string[] {
  if (pointsNeeded <= 0) return [];

  const options = [
    { key: 'website', label: 'Add website (+3)', points: IDENTITY_ANCHOR_WEIGHTS.website },
    { key: 'instagram', label: 'Add Instagram (+2)', points: IDENTITY_ANCHOR_WEIGHTS.instagram },
    { key: 'coords', label: 'Add coordinates (+2)', points: IDENTITY_ANCHOR_WEIGHTS.coords },
    { key: 'tiktok', label: 'Add TikTok (+2)', points: IDENTITY_ANCHOR_WEIGHTS.tiktok },
    { key: 'phone', label: 'Add phone (+1)', points: IDENTITY_ANCHOR_WEIGHTS.phone },
    { key: 'neighborhood', label: 'Add neighborhood (+1)', points: IDENTITY_ANCHOR_WEIGHTS.neighborhood },
  ] as const satisfies ReadonlyArray<{ key: IdentityAnchorKey; label: string; points: number }>;

  const missingOptions = options.filter((opt) => !anchors[opt.key]);

  const rankedOptions = [...missingOptions].sort((a, b) => b.points - a.points);

  const plan: string[] = [];
  let accumulated = 0;
  for (const opt of rankedOptions) {
    if (accumulated >= pointsNeeded) break;
    plan.push(opt.label);
    accumulated += opt.points;
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Issue Rules
// ---------------------------------------------------------------------------

export const ISSUE_RULES: IssueRule[] = [
  {
    issueType: 'unresolved_identity',
    problemClass: 'identity',
    severity: 'critical',
    blockingPublish: true,
    recommendedTool: 'gpid_resolution',
    detect: (e) => {
      // Identity is "sufficient" if we have enough weighted anchors,
      // not just GPID. A taco cart with an IG handle + neighborhood is valid.
      if (e.googlePlaceId) return null; // GPID alone = resolved

      const { anchors, score } = getIdentityAnchorState(e);

      // Nomadic entities (pop-ups) have lower identity threshold.
      // They don't need coords/GPID — name + Instagram or name + website is enough.
      // Threshold: 2 (e.g., Instagram alone = 2 ✓)
      // Fixed entities need at least 4 (e.g., Instagram + coords = 4 ✓)
      const threshold = e.isNomadic ? 2 : 4;
      if (score >= threshold) return null;

      const pointsNeeded = threshold - score;
      const presentAnchors = (Object.keys(anchors) as IdentityAnchorKey[]).filter((k) => anchors[k]);
      const missingAnchors = (Object.keys(anchors) as IdentityAnchorKey[]).filter((k) => !anchors[k]);

      return {
        detected: true,
        detail: {
          identity_score: score,
          threshold,
          points_needed: pointsNeeded,
          has_gpid: false,
          is_nomadic: e.isNomadic,
          present_anchors: presentAnchors,
          missing_anchors: missingAnchors,
          fastest_fixes: getFastestIdentityFixes(anchors, pointsNeeded),
        },
      };
    },
  },
  {
    issueType: 'missing_gpid',
    problemClass: 'identity',
    severity: 'medium',
    blockingPublish: false,
    recommendedTool: 'gpid_resolution',
    detect: (e) => {
      // Non-blocking: entity has sufficient identity but no GPID.
      // Nomadic entities don't need GPID — skip entirely.
      if (e.isNomadic) return null;
      if (e.googlePlaceId) return null;
      // Only flag if identity IS sufficient (otherwise unresolved_identity covers it)
      const { score } = getIdentityAnchorState(e);
      if (score < 4) return null; // covered by unresolved_identity
      return { detected: true };
    },
  },
  {
    issueType: 'enrichment_incomplete',
    problemClass: 'identity',
    severity: 'high',
    blockingPublish: true,
    recommendedTool: 'enrich_full',
    detect: (e) => {
      // Only applies if entity has GPID but was never enriched
      if (!e.googlePlaceId) return null; // covered by unresolved_identity
      if (e.enrichmentStage && e.enrichmentStage !== 'none') return null;
      if (e.lastEnrichedAt) return null;
      return { detected: true, detail: { enrichmentStage: e.enrichmentStage } };
    },
  },
  {
    issueType: 'missing_coords',
    problemClass: 'location',
    severity: 'high',
    blockingPublish: true,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      // Nomadic entities don't have a fixed location — coords come from appearances, not the entity itself
      if (e.isNomadic) return null;
      if (!e.googlePlaceId) return null; // covered by unresolved_identity
      const lat = e.latitude !== null && e.latitude !== undefined;
      const lng = e.longitude !== null && e.longitude !== undefined;
      if (!lat || !lng) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_neighborhood',
    problemClass: 'location',
    severity: 'medium',
    blockingPublish: false,
    recommendedTool: 'derive_neighborhood',
    detect: (e) => {
      // Nomadic entities derive neighborhood from their appearances, not the entity itself
      if (e.isNomadic) return null;
      const lat = e.latitude !== null && e.latitude !== undefined;
      const lng = e.longitude !== null && e.longitude !== undefined;
      if (!lat || !lng) return null; // needs coords first
      // Check both entities.neighborhood and CES
      const hasNeighborhood = e.neighborhood || e.cesNeighborhood;
      if (!hasNeighborhood) return { detected: true };
      return null;
    },
  },
  {
    issueType: 'missing_hours',
    problemClass: 'location',
    severity: 'medium',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      // Nomadic entities have schedules via appearances, not fixed hours
      if (e.isNomadic) return null;
      // Hotels do not require opening hours in current entity-type expectations.
      if (e.primaryVertical === 'STAY') return null;
      const hasHours = (e.cesHoursJson ?? e.hours) !== null && (e.cesHoursJson ?? e.hours) !== undefined;
      if (!hasHours) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_price_level',
    problemClass: 'location',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      const FOOD_DRINK_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY']);
      if (!e.primaryVertical || !FOOD_DRINK_VERTICALS.has(e.primaryVertical)) return null;
      const hasPriceLevel = (e.cesPriceLevel ?? e.priceLevel) !== null && (e.cesPriceLevel ?? e.priceLevel) !== undefined;
      if (!hasPriceLevel) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_menu_link',
    problemClass: 'location',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      const FOOD_DRINK_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY']);
      if (!e.primaryVertical || !FOOD_DRINK_VERTICALS.has(e.primaryVertical)) return null;
      if (!e.cesMenuUrl) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_reservations',
    problemClass: 'location',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      const RESERVATION_VERTICALS = new Set(['EAT', 'DRINKS', 'WINE', 'STAY']);
      if (!e.primaryVertical || !RESERVATION_VERTICALS.has(e.primaryVertical)) return null;
      const hasReservationUrl = (e.cesReservationUrl ?? e.reservationUrl) !== null && (e.cesReservationUrl ?? e.reservationUrl) !== undefined;
      if (!hasReservationUrl) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issueType: 'operating_status_unknown',
    problemClass: 'location',
    severity: 'medium',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      // Only emit when GPID exists; otherwise status lookup cannot be automated.
      if (!e.googlePlaceId) return null;
      if (!e.businessStatus || !e.businessStatus.trim()) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_website',
    problemClass: 'contact',
    severity: 'medium',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      // Prefer CES if available, fall back to entities
      const website = e.cesWebsite ?? e.website;
      if (!website) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_phone',
    problemClass: 'contact',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      const phone = e.cesPhone ?? e.phone;
      if (!phone) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issueType: 'missing_instagram',
    problemClass: 'social',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'instagram_discover',
    detect: (e) => {
      const instagram = e.cesInstagram ?? e.instagram;
      // 'NONE' = confirmed no Instagram — not an issue
      if (!instagram) return { detected: true };
      if (instagram === 'NONE') return null;
      return null;
    },
  },
  {
    issueType: 'missing_tiktok',
    problemClass: 'social',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'tiktok_discover',
    detect: (e) => {
      const tiktok = e.cesTiktok ?? e.tiktok;
      // 'NONE' = confirmed no TikTok — not an issue
      if (!tiktok) return { detected: true };
      if (tiktok === 'NONE') return null;
      return null;
    },
  },
  {
    issueType: 'google_says_closed',
    problemClass: 'identity',
    severity: 'high',
    blockingPublish: false,
    recommendedTool: null,
    detect: (e) => {
      if (!e.businessStatus) return null;
      const bs = e.businessStatus.toUpperCase();
      if (bs === 'CLOSED_TEMPORARILY') {
        // Only flag if entity status is still OPEN
        if (e.status === 'OPEN') return { detected: true, detail: { googleStatus: 'CLOSED_TEMPORARILY' } };
      }
      if (bs === 'CLOSED_PERMANENTLY') {
        if (e.status !== 'PERMANENTLY_CLOSED') return { detected: true, detail: { googleStatus: 'CLOSED_PERMANENTLY' } };
      }
      return null;
    },
  },
  // --- Editorial: event program gaps ---
  {
    issueType: 'missing_events_surface',
    problemClass: 'editorial',
    severity: 'low',
    blockingPublish: false,
    recommendedTool: 'enrich_stage',
    detect: (e) => {
      // Only flag for food/drink verticals that are likely to have events
      const EVENT_VERTICALS = new Set(['EAT', 'DRINKS', 'WINE', 'COFFEE']);
      if (!e.primaryVertical || !EVENT_VERTICALS.has(e.primaryVertical)) return null;
      // Must have a website (otherwise we can't discover surfaces)
      const website = e.cesWebsite ?? e.website;
      if (!website) return null;
      // Skip if events surface already exists
      if (e.hasEventsSurface) return null;
      return { detected: true, detail: { recommended_stage: 2 } };
    },
  },
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scan entities and upsert entity_issues rows.
 *
 * For each entity × each rule:
 * 1. If problem detected AND no existing active issue → create (or re-open resolved)
 * 2. If problem detected AND active issue exists → leave as-is (unchanged)
 * 3. If problem NOT detected AND active issue exists → resolve it
 * 4. If suppressed → never touch
 */
export async function scanEntities(
  prisma: PrismaClient,
  options: {
    slugs?: string[];
    entityIds?: string[];
    dryRun?: boolean;
    verbose?: boolean;
  } = {},
): Promise<ScanSummary> {
  const { slugs, entityIds, dryRun = false, verbose = false } = options;

  // Build where clause — only non-CANDIDATE entities
  const where: Record<string, unknown> = {
    status: { not: 'CANDIDATE' },
  };
  if (slugs && slugs.length > 0) {
    where.slug = { in: slugs };
  }
  if (entityIds && entityIds.length > 0) {
    where.id = { in: entityIds };
  }

  // Fetch entities with CES join
  const entities = await prisma.entities.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      primaryVertical: true,
      googlePlaceId: true,
      latitude: true,
      longitude: true,
      neighborhood: true,
      phone: true,
      website: true,
      hours: true,
      priceLevel: true,
      reservationUrl: true,
      instagram: true,
      tiktok: true,
      businessStatus: true,
      enrichmentStage: true,
      lastEnrichedAt: true,
      canonical_state: {
        select: {
          website: true,
          phone: true,
          hoursJson: true,
          priceLevel: true,
          reservationUrl: true,
          menuUrl: true,
          instagram: true,
          tiktok: true,
          neighborhood: true,
          eventsUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary: ScanSummary = {
    entitiesScanned: entities.length,
    issuesCreated: 0,
    issuesResolved: 0,
    issuesUnchanged: 0,
    byType: {},
    results: [],
  };

  // Pre-fetch events surface existence for all entities in batch
  const allEntityIds = entities.map((e) => e.id);
  const eventsSurfaceRows = allEntityIds.length > 0
    ? await prisma.merchant_surfaces.findMany({
        where: { entityId: { in: allEntityIds }, surfaceType: 'events' },
        select: { entityId: true },
        distinct: ['entityId'],
      })
    : [];
  const hasEventsSurfaceSet = new Set(eventsSurfaceRows.map((r) => r.entityId));

  // Pre-fetch nomadic status — entities with place_appearances are pop-ups/mobile
  const nomadicRows = allEntityIds.length > 0
    ? await prisma.place_appearances.findMany({
        where: { subjectEntityId: { in: allEntityIds } },
        select: { subjectEntityId: true },
        distinct: ['subjectEntityId'],
      })
    : [];
  const nomadicEntitySet = new Set(nomadicRows.map((r) => r.subjectEntityId));

  for (const raw of entities) {
    const entity: ScanEntity = {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      status: raw.status,
      primaryVertical: raw.primaryVertical ?? null,
      googlePlaceId: raw.googlePlaceId,
      latitude: raw.latitude,
      longitude: raw.longitude,
      neighborhood: raw.neighborhood,
      phone: raw.phone,
      website: raw.website,
      hours: raw.hours,
      priceLevel: raw.priceLevel ?? null,
      reservationUrl: raw.reservationUrl ?? null,
      instagram: raw.instagram,
      tiktok: raw.tiktok,
      enrichmentStage: raw.enrichmentStage,
      lastEnrichedAt: raw.lastEnrichedAt,
      businessStatus: raw.businessStatus ?? null,
      cesWebsite: raw.canonical_state?.website ?? null,
      cesPhone: raw.canonical_state?.phone ?? null,
      cesHoursJson: raw.canonical_state?.hoursJson ?? null,
      cesPriceLevel: raw.canonical_state?.priceLevel ?? null,
      cesReservationUrl: raw.canonical_state?.reservationUrl ?? null,
      cesMenuUrl: raw.canonical_state?.menuUrl ?? null,
      cesInstagram: raw.canonical_state?.instagram ?? null,
      cesTiktok: raw.canonical_state?.tiktok ?? null,
      cesNeighborhood: raw.canonical_state?.neighborhood ?? null,
      cesEventsUrl: raw.canonical_state?.eventsUrl ?? null,
      hasEventsSurface: hasEventsSurfaceSet.has(raw.id),
      isNomadic: nomadicEntitySet.has(raw.id),
    };

    const result: ScanResult = {
      entityId: entity.id,
      slug: entity.slug,
      name: entity.name,
      issuesCreated: 0,
      issuesResolved: 0,
      issuesUnchanged: 0,
    };

    // Get existing issues for this entity (all statuses)
    const existingIssues = await prisma.entity_issues.findMany({
      where: { entityId: entity.id },
    });
    const issueMap = new Map(existingIssues.map((i) => [i.issueType, i]));
    const isClosedEntity = entity.status === 'CLOSED' || entity.status === 'PERMANENTLY_CLOSED';

    for (const rule of ISSUE_RULES) {
      // Closed entities should remain observable in core records, but they are not
      // actionable for enrichment/completeness triage. Force non-detection here so
      // stale open issues are auto-resolved on re-scan.
      const detection = isClosedEntity ? null : rule.detect(entity);
      const existing = issueMap.get(rule.issueType);

      if (detection) {
        // Problem detected
        summary.byType[rule.issueType] = (summary.byType[rule.issueType] ?? 0) + 1;

        if (existing) {
          if (existing.status === 'suppressed') {
            // Never touch suppressed issues
            result.issuesUnchanged++;
            if (verbose) {
              console.log(`  SKIP ${entity.slug}: ${rule.issueType} (suppressed)`);
            }
          } else if (existing.status === 'resolved') {
            // Re-open resolved issue — problem recurred
            if (!dryRun) {
              await prisma.entity_issues.update({
                where: { id: existing.id },
                data: {
                  status: 'open',
                  resolvedAt: null,
                  resolvedBy: null,
                  detail: (detection.detail ?? existing.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                },
              });
            }
            result.issuesCreated++;
            if (verbose) {
              console.log(`  REOPEN ${entity.slug}: ${rule.issueType}`);
            }
          } else {
            // Active issue already exists — leave it
            result.issuesUnchanged++;
          }
        } else {
          // New issue
          if (!dryRun) {
            await prisma.entity_issues.create({
              data: {
                entityId: entity.id,
                problemClass: rule.problemClass,
                issueType: rule.issueType,
                status: 'open',
                severity: rule.severity,
                blockingPublish: rule.blockingPublish,
                recommendedTool: rule.recommendedTool,
                detail: detection.detail ? (detection.detail as Prisma.InputJsonValue) : undefined,
              },
            });
          }
          result.issuesCreated++;
          if (verbose) {
            console.log(`  NEW  ${entity.slug}: ${rule.issueType} [${rule.severity}]`);
          }
        }
      } else {
        // Problem NOT detected
        if (existing && !['resolved', 'suppressed'].includes(existing.status)) {
          // Was active, now resolved
          if (!dryRun) {
            await prisma.entity_issues.update({
              where: { id: existing.id },
              data: {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: 'SCANNER',
              },
            });
          }
          result.issuesResolved++;
          if (verbose) {
            console.log(`  RESOLVED ${entity.slug}: ${rule.issueType}`);
          }
        }
      }
    }

    summary.issuesCreated += result.issuesCreated;
    summary.issuesResolved += result.issuesResolved;
    summary.issuesUnchanged += result.issuesUnchanged;
    summary.results.push(result);
  }

  return summary;
}
