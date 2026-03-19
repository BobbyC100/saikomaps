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
 * Issue types and detection rules:
 *   identity / unresolved_identity    — no GPID (critical, blocking)
 *   identity / enrichment_incomplete  — has GPID but never enriched (high, blocking)
 *   location / missing_coords         — has GPID but no lat/lng (high, blocking)
 *   location / missing_neighborhood   — has coords but no neighborhood (medium)
 *   location / missing_hours          — no canonical/entity hours (medium)
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
  issue_type: string;
  problem_class: 'identity' | 'location' | 'contact' | 'social' | 'editorial';
  severity: 'critical' | 'high' | 'medium' | 'low';
  blocking_publish: boolean;
  recommended_tool: string | null;
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
  primary_vertical: string | null;
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
  enrichment_stage: string | null;
  last_enriched_at: Date | null;
  // CES fields (may be null if no CES row)
  ces_website: string | null;
  ces_phone: string | null;
  ces_hours_json: unknown;
  ces_price_level: number | null;
  ces_reservation_url: string | null;
  ces_menu_url: string | null;
  ces_instagram: string | null;
  ces_tiktok: string | null;
  ces_neighborhood: string | null;
  ces_events_url: string | null;
  businessStatus: string | null;
  // Surface scan hints
  has_events_surface: boolean;
}

export interface ScanResult {
  entity_id: string;
  slug: string;
  name: string;
  issues_created: number;
  issues_resolved: number;
  issues_unchanged: number;
}

export interface ScanSummary {
  entities_scanned: number;
  issues_created: number;
  issues_resolved: number;
  issues_unchanged: number;
  by_type: Record<string, number>;
  results: ScanResult[];
}

// ---------------------------------------------------------------------------
// Issue Rules
// ---------------------------------------------------------------------------

export const ISSUE_RULES: IssueRule[] = [
  {
    issue_type: 'unresolved_identity',
    problem_class: 'identity',
    severity: 'critical',
    blocking_publish: true,
    recommended_tool: 'gpid_resolution',
    detect: (e) => {
      // Identity is "sufficient" if we have enough weighted anchors,
      // not just GPID. A taco cart with an IG handle + neighborhood is valid.
      if (e.googlePlaceId) return null; // GPID alone = resolved

      // Weighted anchors (mirrors lib/identity-enrichment.ts ANCHOR_WEIGHTS)
      let score = 0;
      if (e.website || e.ces_website) score += 3;
      if (e.instagram || e.ces_instagram) score += 2;
      if (e.tiktok || e.ces_tiktok) score += 2;
      if (e.phone || e.ces_phone) score += 1;
      if (e.neighborhood || e.ces_neighborhood) score += 1;
      if (e.latitude && e.longitude) score += 2;

      // Threshold: need at least 4 points of identity signals to be "sufficient"
      // e.g., Instagram (2) + coords (2) = 4 ✓
      // e.g., Website (3) + neighborhood (1) = 4 ✓
      // e.g., Just a name = 0 ✗
      if (score >= 4) return null;

      return { detected: true, detail: { identity_score: score, has_gpid: false } };
    },
  },
  {
    issue_type: 'missing_gpid',
    problem_class: 'identity',
    severity: 'medium',
    blocking_publish: false,
    recommended_tool: 'gpid_resolution',
    detect: (e) => {
      // Non-blocking: entity has sufficient identity but no GPID.
      // Useful to track but doesn't prevent publication.
      if (e.googlePlaceId) return null;
      // Only flag if identity IS sufficient (otherwise unresolved_identity covers it)
      let score = 0;
      if (e.website || e.ces_website) score += 3;
      if (e.instagram || e.ces_instagram) score += 2;
      if (e.tiktok || e.ces_tiktok) score += 2;
      if (e.phone || e.ces_phone) score += 1;
      if (e.neighborhood || e.ces_neighborhood) score += 1;
      if (e.latitude && e.longitude) score += 2;
      if (score < 4) return null; // covered by unresolved_identity
      return { detected: true };
    },
  },
  {
    issue_type: 'enrichment_incomplete',
    problem_class: 'identity',
    severity: 'high',
    blocking_publish: true,
    recommended_tool: 'enrich_full',
    detect: (e) => {
      // Only applies if entity has GPID but was never enriched
      if (!e.googlePlaceId) return null; // covered by unresolved_identity
      if (e.enrichment_stage && e.enrichment_stage !== 'none') return null;
      if (e.last_enriched_at) return null;
      return { detected: true, detail: { enrichment_stage: e.enrichment_stage } };
    },
  },
  {
    issue_type: 'missing_coords',
    problem_class: 'location',
    severity: 'high',
    blocking_publish: true,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
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
    issue_type: 'missing_neighborhood',
    problem_class: 'location',
    severity: 'medium',
    blocking_publish: false,
    recommended_tool: 'derive_neighborhood',
    detect: (e) => {
      const lat = e.latitude !== null && e.latitude !== undefined;
      const lng = e.longitude !== null && e.longitude !== undefined;
      if (!lat || !lng) return null; // needs coords first
      // Check both entities.neighborhood and CES
      const hasNeighborhood = e.neighborhood || e.ces_neighborhood;
      if (!hasNeighborhood) return { detected: true };
      return null;
    },
  },
  {
    issue_type: 'missing_hours',
    problem_class: 'location',
    severity: 'medium',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      const hasHours = (e.ces_hours_json ?? e.hours) !== null && (e.ces_hours_json ?? e.hours) !== undefined;
      if (!hasHours) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issue_type: 'missing_price_level',
    problem_class: 'location',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      const FOOD_DRINK_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY']);
      if (!e.primary_vertical || !FOOD_DRINK_VERTICALS.has(e.primary_vertical)) return null;
      const hasPriceLevel = (e.ces_price_level ?? e.priceLevel) !== null && (e.ces_price_level ?? e.priceLevel) !== undefined;
      if (!hasPriceLevel) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issue_type: 'missing_menu_link',
    problem_class: 'location',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      const FOOD_DRINK_VERTICALS = new Set(['EAT', 'COFFEE', 'WINE', 'DRINKS', 'BAKERY']);
      if (!e.primary_vertical || !FOOD_DRINK_VERTICALS.has(e.primary_vertical)) return null;
      if (!e.ces_menu_url) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issue_type: 'missing_reservations',
    problem_class: 'location',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      const RESERVATION_VERTICALS = new Set(['EAT', 'DRINKS', 'WINE', 'STAY']);
      if (!e.primary_vertical || !RESERVATION_VERTICALS.has(e.primary_vertical)) return null;
      const hasReservationUrl = (e.ces_reservation_url ?? e.reservationUrl) !== null && (e.ces_reservation_url ?? e.reservationUrl) !== undefined;
      if (!hasReservationUrl) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issue_type: 'operating_status_unknown',
    problem_class: 'location',
    severity: 'medium',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
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
    issue_type: 'missing_website',
    problem_class: 'contact',
    severity: 'medium',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      // Prefer CES if available, fall back to entities
      const website = e.ces_website ?? e.website;
      if (!website) {
        return { detected: true, detail: { recommended_stage: 6 } };
      }
      return null;
    },
  },
  {
    issue_type: 'missing_phone',
    problem_class: 'contact',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      const phone = e.ces_phone ?? e.phone;
      if (!phone) {
        return { detected: true, detail: { recommended_stage: 1 } };
      }
      return null;
    },
  },
  {
    issue_type: 'missing_instagram',
    problem_class: 'social',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'instagram_discover',
    detect: (e) => {
      const instagram = e.ces_instagram ?? e.instagram;
      // 'NONE' = confirmed no Instagram — not an issue
      if (!instagram) return { detected: true };
      if (instagram === 'NONE') return null;
      return null;
    },
  },
  {
    issue_type: 'missing_tiktok',
    problem_class: 'social',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'tiktok_discover',
    detect: (e) => {
      const tiktok = e.ces_tiktok ?? e.tiktok;
      // 'NONE' = confirmed no TikTok — not an issue
      if (!tiktok) return { detected: true };
      if (tiktok === 'NONE') return null;
      return null;
    },
  },
  {
    issue_type: 'google_says_closed',
    problem_class: 'identity',
    severity: 'high',
    blocking_publish: false,
    recommended_tool: null,
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
    issue_type: 'missing_events_surface',
    problem_class: 'editorial',
    severity: 'low',
    blocking_publish: false,
    recommended_tool: 'enrich_stage',
    detect: (e) => {
      // Only flag for food/drink verticals that are likely to have events
      const EVENT_VERTICALS = new Set(['EAT', 'DRINKS', 'WINE', 'COFFEE']);
      if (!e.primary_vertical || !EVENT_VERTICALS.has(e.primary_vertical)) return null;
      // Must have a website (otherwise we can't discover surfaces)
      const website = e.ces_website ?? e.website;
      if (!website) return null;
      // Skip if events surface already exists
      if (e.has_events_surface) return null;
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
      primary_vertical: true,
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
      enrichment_stage: true,
      last_enriched_at: true,
      canonical_state: {
        select: {
          website: true,
          phone: true,
          hours_json: true,
          price_level: true,
          reservation_url: true,
          menu_url: true,
          instagram: true,
          tiktok: true,
          neighborhood: true,
          events_url: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary: ScanSummary = {
    entities_scanned: entities.length,
    issues_created: 0,
    issues_resolved: 0,
    issues_unchanged: 0,
    by_type: {},
    results: [],
  };

  // Pre-fetch events surface existence for all entities in batch
  const allEntityIds = entities.map((e) => e.id);
  const eventsSurfaceRows = allEntityIds.length > 0
    ? await prisma.merchant_surfaces.findMany({
        where: { entity_id: { in: allEntityIds }, surface_type: 'events' },
        select: { entity_id: true },
        distinct: ['entity_id'],
      })
    : [];
  const hasEventsSurfaceSet = new Set(eventsSurfaceRows.map((r) => r.entity_id));

  for (const raw of entities) {
    const entity: ScanEntity = {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      status: raw.status,
      primary_vertical: raw.primary_vertical ?? null,
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
      enrichment_stage: raw.enrichment_stage,
      last_enriched_at: raw.last_enriched_at,
      businessStatus: raw.businessStatus ?? null,
      ces_website: raw.canonical_state?.website ?? null,
      ces_phone: raw.canonical_state?.phone ?? null,
      ces_hours_json: raw.canonical_state?.hours_json ?? null,
      ces_price_level: raw.canonical_state?.price_level ?? null,
      ces_reservation_url: raw.canonical_state?.reservation_url ?? null,
      ces_menu_url: raw.canonical_state?.menu_url ?? null,
      ces_instagram: raw.canonical_state?.instagram ?? null,
      ces_tiktok: raw.canonical_state?.tiktok ?? null,
      ces_neighborhood: raw.canonical_state?.neighborhood ?? null,
      ces_events_url: raw.canonical_state?.events_url ?? null,
      has_events_surface: hasEventsSurfaceSet.has(raw.id),
    };

    const result: ScanResult = {
      entity_id: entity.id,
      slug: entity.slug,
      name: entity.name,
      issues_created: 0,
      issues_resolved: 0,
      issues_unchanged: 0,
    };

    // Get existing issues for this entity (all statuses)
    const existingIssues = await prisma.entity_issues.findMany({
      where: { entity_id: entity.id },
    });
    const issueMap = new Map(existingIssues.map((i) => [i.issue_type, i]));

    for (const rule of ISSUE_RULES) {
      const detection = rule.detect(entity);
      const existing = issueMap.get(rule.issue_type);

      if (detection) {
        // Problem detected
        summary.by_type[rule.issue_type] = (summary.by_type[rule.issue_type] ?? 0) + 1;

        if (existing) {
          if (existing.status === 'suppressed') {
            // Never touch suppressed issues
            result.issues_unchanged++;
            if (verbose) {
              console.log(`  SKIP ${entity.slug}: ${rule.issue_type} (suppressed)`);
            }
          } else if (existing.status === 'resolved') {
            // Re-open resolved issue — problem recurred
            if (!dryRun) {
              await prisma.entity_issues.update({
                where: { id: existing.id },
                data: {
                  status: 'open',
                  resolved_at: null,
                  resolved_by: null,
                  detail: (detection.detail ?? existing.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                },
              });
            }
            result.issues_created++;
            if (verbose) {
              console.log(`  REOPEN ${entity.slug}: ${rule.issue_type}`);
            }
          } else {
            // Active issue already exists — leave it
            result.issues_unchanged++;
          }
        } else {
          // New issue
          if (!dryRun) {
            await prisma.entity_issues.create({
              data: {
                entity_id: entity.id,
                problem_class: rule.problem_class,
                issue_type: rule.issue_type,
                status: 'open',
                severity: rule.severity,
                blocking_publish: rule.blocking_publish,
                recommended_tool: rule.recommended_tool,
                detail: detection.detail ? (detection.detail as Prisma.InputJsonValue) : undefined,
              },
            });
          }
          result.issues_created++;
          if (verbose) {
            console.log(`  NEW  ${entity.slug}: ${rule.issue_type} [${rule.severity}]`);
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
                resolved_at: new Date(),
                resolved_by: 'SCANNER',
              },
            });
          }
          result.issues_resolved++;
          if (verbose) {
            console.log(`  RESOLVED ${entity.slug}: ${rule.issue_type}`);
          }
        }
      }
    }

    summary.issues_created += result.issues_created;
    summary.issues_resolved += result.issues_resolved;
    summary.issues_unchanged += result.issues_unchanged;
    summary.results.push(result);
  }

  return summary;
}
