/**
 * Backfill place page fields (places table)
 *
 * Safe, additive, idempotent. DRY RUN by default. Writes only with --apply.
 *
 * Usage:
 *   npm run backfill:place-page-fields:local [-- --apply] [--force] [--limit N] [--where '{"status":"OPEN"}'] [--ids a,b,c] [--verbose]
 *   npm run backfill:place-page-fields:neon [-- --apply] ...
 *
 * Requires: SAIKO_DB_FROM_WRAPPER=1 (use db-local.sh or db-neon.sh).
 */

import { db } from '@/lib/db';
import { getPlaceIds } from '@/lib/la-scope';
import type { places, Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Allowlist: only these columns may be written
// ---------------------------------------------------------------------------
const WRITABLE_COLUMNS = new Set([
  'transitAccessible',
  'thematicTags',
  'contextualConnection',
  'curatorAttribution',
]);

type WritableField = keyof Pick<
  places,
  'transitAccessible' | 'thematicTags' | 'contextualConnection' | 'curatorAttribution'
>;

// ---------------------------------------------------------------------------
// PrimaryVertical labels for contextualConnection
// ---------------------------------------------------------------------------
const VERTICAL_LABELS: Record<string, string> = {
  EAT: 'restaurant',
  COFFEE: 'café',
  WINE: 'wine bar',
  DRINKS: 'bar',
  SHOP: 'shop',
  CULTURE: 'cultural spot',
  NATURE: 'outdoor spot',
  STAY: 'lodging',
  WELLNESS: 'wellness spot',
  BAKERY: 'bakery',
  PURVEYORS: 'purveyor',
  ACTIVITY: 'activity',
};

// ---------------------------------------------------------------------------
// place_personality → thematic tag (normalize for display)
// ---------------------------------------------------------------------------
function personalityToTag(p: string | null): string | null {
  if (!p?.trim()) return null;
  const t = p.trim().toLowerCase();
  return t || null;
}

// Extract thematic tags from text: significant words (>=3 chars), exclude common stop words
const STOP_WORDS = new Set(
  'a an and are as at be by for from has he in is it its of on that the to was were will with'.split(' ')
);
function extractTagsFromText(text: string, max = 5): string[] {
  if (!text?.trim()) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!seen.has(w) && out.length < max) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

/** Normalize thematic tags: lowercase/trim, remove punctuation, dedupe, drop <3 chars and stopwords, cap 15, stable sort */
function normalizeThematicTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = t
      .trim()
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (n.length >= 3 && !STOP_WORDS.has(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.slice(0, 15).sort();
}

// ---------------------------------------------------------------------------
// Deterministic extraction
// ---------------------------------------------------------------------------
type PlaceWithSources = {
  id: string;
  slug: string;
  googlePlaceId: string | null;
  neighborhood: string | null;
  primary_vertical: string;
  tagline: string | null;
  description: string | null;
  vibeTags: string[];
  thematicTags: string[];
  contextualConnection: string | null;
  curatorAttribution: string | null;
  editorialSources: unknown;
};

type MapPlaceCurator = {
  descriptor: string | null;
  lists: { users: { name: string | null; email: string | null } } | null;
};

function getFirstExcerpt(sources: unknown): string | null {
  if (!sources || !Array.isArray(sources)) return null;
  const first = sources[0];
  if (!first || typeof first !== 'object') return null;
  const o = first as Record<string, unknown>;
  const ex = o.excerpt ?? o.content;
  return typeof ex === 'string' && ex.trim() ? ex.trim() : null;
}

function deriveThematicTags(p: PlaceWithSources, placePersonality: string | null, curatorDescriptor: string | null): string[] {
  const raw: string[] = [];

  // 1. place_personality as tag
  const personalityTag = personalityToTag(placePersonality);
  if (personalityTag) raw.push(personalityTag);

  // 2. vibeTags (already thematic)
  for (const v of p.vibeTags || []) raw.push(v);

  // 3. curator descriptor words
  for (const w of extractTagsFromText(curatorDescriptor ?? '', 3)) raw.push(w);

  // 4. first source excerpt words
  const excerpt = getFirstExcerpt(p.editorialSources);
  for (const w of extractTagsFromText(excerpt ?? '', 3)) raw.push(w);

  return normalizeThematicTags(raw);
}

function deriveContextualConnection(
  p: PlaceWithSources,
  placePersonality: string | null
): string | null {
  const hood = p.neighborhood?.trim() || 'LA';
  const vert = VERTICAL_LABELS[p.primary_vertical] || p.primary_vertical.toLowerCase();
  const personality = placePersonality?.replace(/-/g, ' ') ?? 'local favorite';
  const tail = p.tagline?.trim() || p.description?.trim().slice(0, 80) || '';
  const base = `${hood} ${vert} — ${personality}`;
  return tail ? `${base}. ${tail}` : base;
}

function getAttributionFromMapPlace(mp: MapPlaceCurator): string | null {
  const u = mp.lists?.users;
  if (!u) return null;
  const val = u.name?.trim() || u.email?.split('@')[0]?.trim() || null;
  if (!val || /^(unknown|null)$/i.test(val)) return null;
  return val;
}

/** If exactly one unique attribution across all map_places with descriptor, return it; else null */
function deriveCuratorAttribution(mapPlaces: MapPlaceCurator[]): string | null {
  const attributions = new Set<string>();
  for (const mp of mapPlaces) {
    const a = getAttributionFromMapPlace(mp);
    if (a) attributions.add(a.toLowerCase());
  }
  if (attributions.size !== 1) return null;
  const only = [...attributions][0];
  for (const mp of mapPlaces) {
    const a = getAttributionFromMapPlace(mp);
    if (a && a.toLowerCase() === only) return a;
  }
  return null;
}

// Allowed keys for --where (prevents arbitrary filters)
const WHERE_ALLOWED_KEYS = new Set(['status', 'id', 'slug', 'neighborhood', 'primary_vertical']);

function allowlistWhere(obj: Record<string, unknown>): Prisma.placesWhereInput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (WHERE_ALLOWED_KEYS.has(k)) out[k] = v;
  }
  return out as Prisma.placesWhereInput;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(): {
  apply: boolean;
  force: boolean;
  limit: number | null;
  where: Prisma.placesWhereInput | null;
  ids: string[] | null;
  laOnly: boolean;
  verbose: boolean;
} {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const force = argv.includes('--force');
  const laOnly = argv.includes('--la-only');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 && argv[limitIdx + 1] ? parseInt(argv[limitIdx + 1], 10) : null;
  const whereIdx = argv.indexOf('--where');
  let where: Prisma.placesWhereInput | null = null;
  if (whereIdx >= 0 && argv[whereIdx + 1]) {
    try {
      const parsed = JSON.parse(argv[whereIdx + 1]) as Record<string, unknown>;
      where = Object.keys(parsed).length > 0 ? allowlistWhere(parsed) : null;
    } catch {
      console.error('--where must be valid JSON');
      process.exit(1);
    }
  }
  const idsIdx = argv.indexOf('--ids');
  const ids =
    idsIdx >= 0 && argv[idsIdx + 1]
      ? argv[idsIdx + 1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
  const verbose = argv.includes('--verbose');
  return { apply, force, limit, where, ids, laOnly, verbose };
}

// ---------------------------------------------------------------------------
// Self-check: DB probe (non-fatal if psql missing)
// ---------------------------------------------------------------------------
async function dbSelfCheck(): Promise<void> {
  try {
    const r = await db.$queryRaw<unknown[]>`SELECT current_database() as db, inet_server_addr() as host, inet_server_port() as port`;
    const row = r[0] as Record<string, unknown>;
    console.log(`[DB] database=${row?.db ?? '?'} host=${row?.host ?? '?'} port=${row?.port ?? '?'}`);
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  if (process.env.SAIKO_DB_FROM_WRAPPER !== '1') {
    console.error('Refusing to run: SAIKO_DB_FROM_WRAPPER must be 1. Use db-local.sh or db-neon.sh.');
    process.exit(1);
  }

  await dbSelfCheck();

  const { apply, force, limit, where, ids: idsArg, laOnly, verbose } = parseArgs();

  let ids = idsArg;
  if (laOnly) {
    const laIds = await getPlaceIds({ laOnly: true, limit });
    ids = laIds ?? [];
  }
  const scopeCount = ids?.length ?? 0;
  console.log(`[SCOPE] laOnly=${laOnly} ids=${scopeCount} limit=${limit ?? 'none'}\n`);
  console.log('Backfill place page fields (places table)\n');
  if (!apply) {
    console.log('DRY RUN (no writes). Use --apply to persist.\n');
  }
  if (force) {
    console.log('--force: will overwrite non-empty target fields.\n');
  }

  // Build base where (ids from --ids or --la-only)
  const baseWhere: Prisma.placesWhereInput = {
    ...(ids?.length ? { id: { in: ids } } : laOnly ? { id: { in: [] } } : {}),
    ...(where ?? {}),
  };

  if (laOnly && (!ids || ids.length === 0)) {
    console.log('No LA places in scope. Exiting.');
    process.exit(0);
  }

  // Fetch places with map_places and golden_records (for place_personality)
  const places = await db.places.findMany({
    where: baseWhere,
    take: limit ?? undefined,
    select: {
      id: true,
      slug: true,
      googlePlaceId: true,
      neighborhood: true,
      primary_vertical: true,
      tagline: true,
      description: true,
      vibeTags: true,
      thematicTags: true,
      contextualConnection: true,
      curatorAttribution: true,
      editorialSources: true,
      map_places: {
        where: { descriptor: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: {
          descriptor: true,
          lists: {
            select: { users: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  // Resolve place_personality from golden_records
  const googleIds = places.map((p) => p.googlePlaceId).filter(Boolean) as string[];
  const goldenMap = new Map<string, string | null>();
  if (googleIds.length > 0) {
    const goldens = await db.golden_records.findMany({
      where: { google_place_id: { in: googleIds } },
      select: { google_place_id: true, place_personality: true },
    });
    for (const g of goldens) {
      if (g.google_place_id) goldenMap.set(g.google_place_id, g.place_personality);
    }
  }

  const summary = {
    scanned: places.length,
    would_update: 0,
    updated: 0,
    byField: {} as Record<string, number>,
  };
  for (const f of WRITABLE_COLUMNS) {
    summary.byField[f] = 0;
  }

  for (const p of places) {
    const placePersonality = p.googlePlaceId ? goldenMap.get(p.googlePlaceId!) ?? null : null;
    const mapPlacesWithDescriptor = (p.map_places ?? []) as MapPlaceCurator[];
    const curatorDescriptor =
      mapPlacesWithDescriptor[0]?.descriptor?.trim() ?? null;

    const placeRow = p as unknown as PlaceWithSources;

    const updates: Partial<Record<WritableField, unknown>> = {};

    // thematicTags
    const newThematic = deriveThematicTags(placeRow, placePersonality, curatorDescriptor);
    const emptyThematic = !p.thematicTags?.length;
    if (newThematic.length > 0 && (force || emptyThematic)) {
      updates.thematicTags = newThematic;
    }

    // contextualConnection
    const newContextual = deriveContextualConnection(placeRow, placePersonality);
    const emptyContextual = !p.contextualConnection?.trim();
    if (newContextual && (force || emptyContextual)) {
      updates.contextualConnection = newContextual;
    }

    // curatorAttribution (from map_places + lists.users; null if multiple owners or missing)
    const newCurator = deriveCuratorAttribution(mapPlacesWithDescriptor);
    const emptyCurator = !p.curatorAttribution?.trim();
    if (newCurator && (force || emptyCurator)) {
      updates.curatorAttribution = newCurator;
    }

    // transitAccessible: leave null (Option B, no-op)
    // Skip adding to updates

    if (Object.keys(updates).length === 0) continue;

    summary.would_update++;
    for (const k of Object.keys(updates)) {
      summary.byField[k as WritableField]++;
    }

    if (verbose) {
      console.log(`  ${p.slug}: ${Object.keys(updates).join(', ')}`);
    }

    if (apply) {
      await db.places.update({
        where: { id: p.id },
        data: updates as Prisma.placesUpdateInput,
      });
      summary.updated++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`scanned: ${summary.scanned}`);
  console.log(apply ? `updated: ${summary.updated}` : `would_update: ${summary.would_update}`);
  console.log('per-field:');
  for (const [k, v] of Object.entries(summary.byField)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  console.log('\nOK');

  if (apply && summary.updated > 0) {
    // Ensure exit 0 on success
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
