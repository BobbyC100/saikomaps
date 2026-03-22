/**
 * Corpus Audit: Entity Dimension Classification
 *
 * Classifies every active entity across the four dimensions defined in
 * ARCH-ENTITY-CLASSIFICATION-FRAMEWORK-V1:
 *   1. location_type    — fixed / mobile / contained / civic
 *   2. schedule_type    — regular / market / route / open_access / date_bounded
 *   3. identity_anchor  — gpid / social / operator / parent / coordinates
 *   4. containment_type — independent / contained / host
 *
 * Heuristics are deterministic and based on existing data signals:
 *   - primary_vertical, entity_type, address, google_place_id
 *   - instagram, parentId, market_schedule, ParkFacilityRelationship
 *   - name pattern matching (truck, cart, mobile, pop-up, etc.)
 *
 * Output: CSV to stdout (pipe to file) with columns:
 *   entity_id, slug, name, primary_vertical, entity_type, current_status,
 *   inferred_location_type, inferred_schedule_type, inferred_identity_anchor,
 *   inferred_containment_type, confidence, reasoning
 *
 * Usage:
 *   npx tsx scripts/audit-entity-dimensions.ts > entity-dimensions-audit.csv
 *   npx tsx scripts/audit-entity-dimensions.ts --summary   # summary stats only
 *   npx tsx scripts/audit-entity-dimensions.ts --limit 100 # first 100 entities
 *
 * Phase 1B of ARCH-ENTITY-DIMENSION-IMPLEMENTATION-PLAN-V1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LocationType = 'fixed' | 'mobile' | 'contained' | 'civic';
type ScheduleType = 'regular' | 'market' | 'route' | 'open_access' | 'date_bounded';
type IdentityAnchorType = 'gpid' | 'social' | 'operator' | 'parent' | 'coordinates';
type ContainmentType = 'independent' | 'contained' | 'host';

interface DimensionResult {
  location_type: LocationType;
  schedule_type: ScheduleType;
  identity_anchor: IdentityAnchorType;
  containment_type: ContainmentType;
  confidence: number;      // 0.0–1.0
  reasoning: string[];     // human-readable explanation of each inference
}

interface EntityRow {
  id: string;
  slug: string;
  name: string;
  primaryVertical: string;
  entityType: string;
  status: string;
  googlePlaceId: string | null;
  address: string | null;
  instagram: string | null;
  hours: any;
  parentId: string | null;
  marketSchedule: any;
  latitude: any;
  longitude: any;
  restaurantGroupId: string | null;
}

// ---------------------------------------------------------------------------
// Name pattern detection
// ---------------------------------------------------------------------------

const MOBILE_NAME_PATTERNS = [
  /\btruck\b/i,
  /\bcart\b/i,
  /\bmobile\b/i,
  /\btrailer\b/i,
  /\bwagon\b/i,
  /\bstreet\s*food\b/i,
  /\bfood\s*stand\b/i,
];

const POPUP_NAME_PATTERNS = [
  /\bpop[- ]?up\b/i,
  /\bresidency\b/i,
  /\btemporary\b/i,
  /\blimited[- ]?time\b/i,
];

const CIVIC_NAME_PATTERNS = [
  /\bpark\b/i,
  /\btrail\b/i,
  /\bbeach\b/i,
  /\brecreation\s+center\b/i,
  /\bplayground\b/i,
  /\bpublic\s+pool\b/i,
  /\bskate\s*park\b/i,
  /\bdog\s+park\b/i,
  /\bgarden(?:s)?\b/i,
  /\bpreserve\b/i,
  /\bopen\s+space\b/i,
];

function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(name));
}

// ---------------------------------------------------------------------------
// Heuristic engine
// ---------------------------------------------------------------------------

function classifyEntity(
  entity: EntityRow,
  isChild: boolean,      // has parent_id or is a child in ParkFacilityRelationship
  isParent: boolean,     // is a parent in ParkFacilityRelationship
  hasChildren: boolean,  // has entities pointing to it via parent_id
): DimensionResult {
  const reasons: string[] = [];
  let confidence = 0.5; // baseline

  const hasGpid = !!entity.googlePlaceId;
  const hasAddress = !!entity.address;
  const hasInstagram = !!entity.instagram;
  const hasHours = entity.hours != null && JSON.stringify(entity.hours) !== '{}' && JSON.stringify(entity.hours) !== 'null';
  const hasMarketSchedule = entity.marketSchedule != null && JSON.stringify(entity.marketSchedule) !== '{}' && JSON.stringify(entity.marketSchedule) !== 'null';
  const hasLatLng = entity.latitude != null && entity.longitude != null;
  const isPark = entity.primaryVertical === 'PARKS';
  const isActivity = entity.entityType === 'activity';
  const isPublicType = entity.entityType === 'public';
  const isMobileName = matchesAny(entity.name, MOBILE_NAME_PATTERNS);
  const isPopupName = matchesAny(entity.name, POPUP_NAME_PATTERNS);
  const isCivicName = matchesAny(entity.name, CIVIC_NAME_PATTERNS);

  // ---------------------------------------------------------------------------
  // CONTAINMENT TYPE — determine first, influences other dimensions
  // ---------------------------------------------------------------------------

  let containment_type: ContainmentType;

  if (isChild) {
    containment_type = 'contained';
    reasons.push('containment=contained: has parent_id or ParkFacilityRelationship child');
    confidence += 0.1;
  } else if (isParent || hasChildren) {
    containment_type = 'host';
    reasons.push('containment=host: is parent in ParkFacilityRelationship or has children via parent_id');
    confidence += 0.1;
  } else {
    containment_type = 'independent';
    reasons.push('containment=independent: no parent/child relationships');
  }

  // ---------------------------------------------------------------------------
  // LOCATION TYPE
  // ---------------------------------------------------------------------------

  let location_type: LocationType;

  if (containment_type === 'contained') {
    location_type = 'contained';
    reasons.push('location=contained: entity is contained within a parent');
    confidence += 0.1;
  } else if (isPark && !hasAddress && isCivicName) {
    location_type = 'civic';
    reasons.push('location=civic: PARKS vertical, no address, civic name pattern');
    confidence += 0.15;
  } else if (isPark && !hasGpid) {
    location_type = 'civic';
    reasons.push('location=civic: PARKS vertical, no GPID');
    confidence += 0.1;
  } else if (isPublicType && isCivicName) {
    location_type = 'civic';
    reasons.push('location=civic: entity_type=public with civic name pattern');
    confidence += 0.1;
  } else if (isMobileName && !hasAddress) {
    location_type = 'mobile';
    reasons.push('location=mobile: mobile name pattern, no address');
    confidence += 0.1;
  } else if (isMobileName && hasAddress) {
    location_type = 'mobile';
    reasons.push('location=mobile: mobile name pattern (has address, may be commissary)');
    confidence += 0.05;
  } else if (isPopupName) {
    location_type = 'mobile';
    reasons.push('location=mobile: pop-up/residency name pattern');
    confidence += 0.05;
  } else if (hasAddress || hasGpid) {
    location_type = 'fixed';
    reasons.push(`location=fixed: has ${hasAddress ? 'address' : ''}${hasAddress && hasGpid ? ' + ' : ''}${hasGpid ? 'GPID' : ''}`);
    confidence += 0.15;
  } else if (hasLatLng) {
    location_type = 'fixed';
    reasons.push('location=fixed: has lat/lng but no address or GPID (may need review)');
    confidence += 0.05;
  } else {
    location_type = 'fixed';
    reasons.push('location=fixed: default (no strong signals for other types)');
  }

  // Override: civic parent overrides to civic even if it has address
  if (containment_type === 'host' && isPark) {
    location_type = 'civic';
    reasons.push('location=civic: override — PARKS host entity');
    confidence += 0.1;
  }

  // ---------------------------------------------------------------------------
  // SCHEDULE TYPE
  // ---------------------------------------------------------------------------

  let schedule_type: ScheduleType;

  if (hasMarketSchedule) {
    schedule_type = 'market';
    reasons.push('schedule=market: market_schedule field is populated');
    confidence += 0.15;
  } else if (location_type === 'civic') {
    schedule_type = 'open_access';
    reasons.push('schedule=open_access: civic location type');
    confidence += 0.1;
  } else if (isPopupName) {
    schedule_type = 'date_bounded';
    reasons.push('schedule=date_bounded: pop-up/residency name pattern');
    confidence += 0.05;
  } else if (isMobileName && !hasHours) {
    schedule_type = 'route';
    reasons.push('schedule=route: mobile name pattern, no hours');
    confidence += 0.05;
  } else if (hasHours) {
    schedule_type = 'regular';
    reasons.push('schedule=regular: has structured hours');
    confidence += 0.1;
  } else {
    schedule_type = 'regular';
    reasons.push('schedule=regular: default (most entities have regular hours)');
  }

  // ---------------------------------------------------------------------------
  // IDENTITY ANCHOR
  // ---------------------------------------------------------------------------

  let identity_anchor: IdentityAnchorType;

  if (containment_type === 'contained' && entity.parentId) {
    identity_anchor = 'parent';
    reasons.push('anchor=parent: contained entity with parent_id set');
    confidence += 0.1;
  } else if (hasGpid) {
    identity_anchor = 'gpid';
    reasons.push('anchor=gpid: google_place_id is set');
    confidence += 0.2;
  } else if (hasInstagram && !hasGpid) {
    identity_anchor = 'social';
    reasons.push('anchor=social: has instagram, no GPID');
    confidence += 0.1;
  } else if (entity.restaurantGroupId) {
    identity_anchor = 'operator';
    reasons.push('anchor=operator: has restaurant_group_id, no GPID');
    confidence += 0.05;
  } else if (hasLatLng) {
    identity_anchor = 'coordinates';
    reasons.push('anchor=coordinates: has lat/lng only, no GPID or social');
    confidence += 0.05;
  } else {
    identity_anchor = 'coordinates';
    reasons.push('anchor=coordinates: default (no strong identity signals)');
  }

  // Clamp confidence
  confidence = Math.min(1.0, Math.max(0.0, confidence));

  return {
    location_type,
    schedule_type,
    identity_anchor,
    containment_type,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: reasons,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let summaryOnly = false;
  let limit = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--summary') summaryOnly = true;
    else if (args[i] === '--limit') limit = parseInt(args[++i] || '0', 10) || Infinity;
  }

  return { summaryOnly, limit };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { summaryOnly, limit } = parseArgs();

  // 1. Fetch all active entities with relevant fields
  const entities = await prisma.entities.findMany({
    where: {
      status: { in: ['OPEN', 'CANDIDATE'] },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryVertical: true,
      entityType: true,
      status: true,
      googlePlaceId: true,
      address: true,
      instagram: true,
      hours: true,
      parentId: true,
      marketSchedule: true,
      latitude: true,
      longitude: true,
      restaurantGroupId: true,
    },
    orderBy: { name: 'asc' },
    ...(limit < Infinity ? { take: limit } : {}),
  });

  // 2. Fetch containment relationships
  //    ParkFacilityRelationship: parent_entity_id → child_entity_id
  const parkRels = await prisma.parkFacilityRelationship.findMany({
    select: { parentEntityId: true, childEntityId: true },
  });

  const childIds = new Set<string>();
  const parentIds = new Set<string>();

  for (const rel of parkRels) {
    childIds.add(rel.childEntityId);
    parentIds.add(rel.parentEntityId);
  }

  // Also check parent_id on entities themselves
  const entitiesWithParent = new Set<string>();
  const entitiesWithChildren = new Set<string>();

  for (const e of entities) {
    if (e.parentId) {
      entitiesWithParent.add(e.id);
      entitiesWithChildren.add(e.parentId);
    }
  }

  // 3. Classify each entity
  const results: Array<{
    entity: EntityRow;
    dims: DimensionResult;
  }> = [];

  for (const entity of entities) {
    const isChild = childIds.has(entity.id) || entitiesWithParent.has(entity.id);
    const isParent = parentIds.has(entity.id);
    const hasChildren = entitiesWithChildren.has(entity.id);

    const dims = classifyEntity(entity as EntityRow, isChild, isParent, hasChildren);
    results.push({ entity: entity as EntityRow, dims });
  }

  // 4. Output
  if (summaryOnly) {
    printSummary(results);
  } else {
    printCsv(results);
    // Also print summary to stderr so it doesn't pollute CSV
    printSummary(results, process.stderr);
  }

  await prisma.$disconnect();
}

function printCsv(results: Array<{ entity: EntityRow; dims: DimensionResult }>) {
  // Header
  console.log([
    'entity_id',
    'slug',
    'name',
    'primaryVertical',
    'entity_type',
    'status',
    'has_gpid',
    'has_address',
    'has_instagram',
    'inferred_location_type',
    'inferred_schedule_type',
    'inferred_identity_anchor',
    'inferred_containment_type',
    'confidence',
    'reasoning',
  ].join(','));

  for (const { entity, dims } of results) {
    const row = [
      entity.id,
      entity.slug,
      csvEscape(entity.name),
      entity.primaryVertical,
      entity.entityType,
      entity.status,
      entity.googlePlaceId ? 'Y' : 'N',
      entity.address ? 'Y' : 'N',
      entity.instagram ? 'Y' : 'N',
      dims.location_type,
      dims.schedule_type,
      dims.identity_anchor,
      dims.containment_type,
      dims.confidence,
      csvEscape(dims.reasoning.join('; ')),
    ];
    console.log(row.join(','));
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function printSummary(
  results: Array<{ entity: EntityRow; dims: DimensionResult }>,
  stream: NodeJS.WritableStream = process.stderr,
) {
  const write = (s: string) => stream.write(s + '\n');

  write(`\n=== Entity Dimension Audit Summary ===`);
  write(`Total entities audited: ${results.length}\n`);

  // Count by each dimension
  const locationCounts: Record<string, number> = {};
  const scheduleCounts: Record<string, number> = {};
  const anchorCounts: Record<string, number> = {};
  const containmentCounts: Record<string, number> = {};
  const confidenceBuckets = { high: 0, medium: 0, low: 0 };

  for (const { dims } of results) {
    locationCounts[dims.location_type] = (locationCounts[dims.location_type] || 0) + 1;
    scheduleCounts[dims.schedule_type] = (scheduleCounts[dims.schedule_type] || 0) + 1;
    anchorCounts[dims.identity_anchor] = (anchorCounts[dims.identity_anchor] || 0) + 1;
    containmentCounts[dims.containment_type] = (containmentCounts[dims.containment_type] || 0) + 1;

    if (dims.confidence >= 0.8) confidenceBuckets.high++;
    else if (dims.confidence >= 0.6) confidenceBuckets.medium++;
    else confidenceBuckets.low++;
  }

  write('Location Type:');
  for (const [k, v] of Object.entries(locationCounts).sort((a, b) => b[1] - a[1])) {
    write(`  ${k.padEnd(12)} ${v.toString().padStart(5)}  (${pct(v, results.length)})`);
  }

  write('\nSchedule Type:');
  for (const [k, v] of Object.entries(scheduleCounts).sort((a, b) => b[1] - a[1])) {
    write(`  ${k.padEnd(14)} ${v.toString().padStart(5)}  (${pct(v, results.length)})`);
  }

  write('\nIdentity Anchor:');
  for (const [k, v] of Object.entries(anchorCounts).sort((a, b) => b[1] - a[1])) {
    write(`  ${k.padEnd(14)} ${v.toString().padStart(5)}  (${pct(v, results.length)})`);
  }

  write('\nContainment Type:');
  for (const [k, v] of Object.entries(containmentCounts).sort((a, b) => b[1] - a[1])) {
    write(`  ${k.padEnd(14)} ${v.toString().padStart(5)}  (${pct(v, results.length)})`);
  }

  write('\nConfidence Distribution:');
  write(`  high (≥0.8)    ${confidenceBuckets.high.toString().padStart(5)}  (${pct(confidenceBuckets.high, results.length)})`);
  write(`  medium (0.6-0.8) ${confidenceBuckets.medium.toString().padStart(4)}  (${pct(confidenceBuckets.medium, results.length)})`);
  write(`  low (<0.6)     ${confidenceBuckets.low.toString().padStart(5)}  (${pct(confidenceBuckets.low, results.length)})`);

  // Derived patterns
  write('\nDerived Patterns:');
  const patternCounts: Record<string, number> = {};
  for (const { dims } of results) {
    const pattern = derivePattern(dims);
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  for (const [k, v] of Object.entries(patternCounts).sort((a, b) => b[1] - a[1])) {
    write(`  ${k.padEnd(22)} ${v.toString().padStart(5)}  (${pct(v, results.length)})`);
  }

  write('');
}

function derivePattern(dims: DimensionResult): string {
  const { location_type, schedule_type, identity_anchor, containment_type } = dims;

  if (location_type === 'civic' && containment_type === 'host') return 'Civic parent';
  if (location_type === 'civic') return 'Civic entity';
  if (containment_type === 'contained' && schedule_type === 'market') return 'Market vendor';
  if (containment_type === 'contained') return 'Contained entity';
  if (location_type === 'mobile' && schedule_type === 'date_bounded') return 'Pop-up / residency';
  if (location_type === 'mobile') return 'Mobile entity';
  if (location_type === 'fixed' && schedule_type === 'regular' && identity_anchor === 'gpid') return 'Fixed venue (GPID)';
  if (location_type === 'fixed' && identity_anchor === 'social') return 'Fixed venue (social)';
  if (location_type === 'fixed' && identity_anchor === 'coordinates') return 'Fixed venue (coords)';
  if (location_type === 'fixed') return 'Fixed venue (other)';
  return 'Unclassified';
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
